"""Device endpoints: /devices/*."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.middleware.auth_middleware import (
    get_current_user_id,
    get_optional_user_id,
    require_device_access,
)
from src.models.device import Device
from src.routes.websocket import manager
from src.schemas.device import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    DeviceResponse,
    HeartbeatRequest,
)
from src.schemas.discovery import DiscoveredDeviceResponse, ScanSubmission
from src.services.device_service import DeviceService, effective_status, owned_network_id
from src.services.discovery_service import DiscoveryService, UnknownScanNetworkError
from src.utils.concurrency import run_blocking
from src.utils.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_NUMBER, ErrorCode
from src.utils.logger import get_logger
from src.utils.responses import build_pagination, single_error_response, success_response

logger = get_logger("device_routes")

router = APIRouter(prefix="/devices", tags=["Devices"])


def _serialize(device: Device) -> dict[str, Any]:
    """Render a device for the API, without its push token.

    ``status`` is the derived one: the stored column only records what the last
    heartbeat said, so a device that simply stopped speaking would otherwise be
    reported as ONLINE indefinitely.
    """
    payload = DeviceResponse.model_validate(device).model_dump(mode="json")
    payload["status"] = effective_status(device)
    return payload


def _unknown_network(message: str) -> HTTPException:
    """403 for a scan naming a network the caller does not administer.

    403 rather than 404, and one code for both "no such network" and "not
    yours": telling them apart would let a caller probe which router MACs are
    registered by anyone at all.
    """
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=single_error_response(
            ErrorCode.UNKNOWN_SCAN_NETWORK,
            status.HTTP_403_FORBIDDEN,
            message=message,
        ),
    )


def _not_found() -> HTTPException:
    """404 for a device that does not exist."""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=single_error_response(
            ErrorCode.DEVICE_NOT_FOUND, status.HTTP_404_NOT_FOUND, field="device_id"
        ),
    )


def _forbidden() -> HTTPException:
    """403 for a device on a network the caller does not administer."""
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=single_error_response(ErrorCode.UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
    )


def _require_network_admin(device: Device, user_id: uuid.UUID) -> None:
    """Raise unless this user administers the network the device sits on.

    Deliberately *not* an ownership check: a guest has no owner, and the admin
    must still be able to see and remove it. Administering the network is the
    permission that matters.
    """
    if device.wifi_network.user_id != user_id:
        logger.warning(f"User {user_id} touched device {device.device_id} on another network")
        raise _forbidden()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_device(
    payload: DeviceRegisterRequest,
    user_id: uuid.UUID | None = Depends(get_optional_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Register the calling device and attach it to its WiFi network.

    This is the one endpoint that accepts an unauthenticated request. The
    presence of a valid user token decides what gets created:

    * **With a token** -- an owned device, belonging to that user.
    * **Without one** -- a guest device, belonging to the network only. The
      response carries a device token authorising just this device's
      heartbeat, so a guest can stay visible without holding an account.

    A guest appears in the admin's list immediately and can be alerted; no
    approval step stands between opening the app and being findable, which is
    the whole point of guest access.
    """
    service = DeviceService(db)
    try:
        device_id, device_token = await run_blocking(
            service.register_device, user_id, payload.model_dump(mode="json")
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=single_error_response(
                ErrorCode.DEVICE_NOT_FOUND,
                status.HTTP_404_NOT_FOUND,
                field="wifi_mac",
                message=(
                    "No account has claimed this WiFi network yet. The network "
                    "owner must register a device before guests can join."
                ),
            ),
        ) from exc

    return success_response(
        DeviceRegisterResponse(
            device_id=device_id,
            is_guest=user_id is None,
            device_token=device_token,
        ).model_dump(mode="json"),
        message="Device registered",
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/list")
async def list_devices(
    page: int = Query(default=MIN_PAGE_NUMBER, ge=MIN_PAGE_NUMBER),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """List the caller devices on their current network, paginated.

    Returns every device on the network, guests included, each flagged with
    ``is_guest``. Requires a user token: a guest device holds only a device
    token and can never enumerate the network it joined.
    """
    service = DeviceService(db)
    try:
        wifi_id = await run_blocking(service.get_current_wifi_id, user_id)
    except LookupError:
        # A brand-new account with nothing registered yet is an empty list, not
        # an error -- the dashboard renders its empty state from exactly this.
        return success_response(
            [],
            message="No devices found",
            pagination=build_pagination(0, page, limit),
        )

    devices, total = await run_blocking(service.get_devices, user_id, wifi_id, page, limit)
    return success_response(
        [_serialize(device) for device in devices],
        message="Devices retrieved",
        pagination=build_pagination(total, page, limit),
    )


# The three discovery routes are declared *before* /{device_id} on purpose.
# FastAPI matches in declaration order, so "/devices/discovered" registered
# after the path-parameter route is swallowed by it and answered with a 422
# about "discovered" not being a UUID.


@router.post("/scan")
async def submit_scan(
    payload: ScanSubmission,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Record what a client saw on its WiFi network.

    The scan runs on the phone, not here. This API is a cloud relay -- a scan
    executed in the datacenter enumerates the hosting provider's network, not
    the user's home -- so a device that is actually on the network does the
    looking and posts the result.

    Everything in the body is a claim by that client. It is stored for display
    only: a discovered device has no push token and can never be alerted. The
    one thing verified is that the caller administers the network named.
    """
    service = DiscoveryService(db)
    try:
        recorded = await run_blocking(
            service.record_scan, user_id, payload.wifi_mac, payload.devices
        )
    except UnknownScanNetworkError as exc:
        raise _unknown_network(str(exc)) from exc

    return success_response({"recorded": recorded}, message="Scan recorded")


@router.get("/discovered")
async def list_discovered(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """List what has been seen on the caller current network.

    These are *not* devices. They are observations of things on the network
    that have no app installed, which is what lets the dashboard distinguish
    "you have one device" from "you have one device and nine other things".

    Empty for a network nobody has scanned yet, which is not an error.
    """
    wifi_id = await run_blocking(owned_network_id, db, user_id)
    if wifi_id is None:
        return success_response([], message="No devices discovered")

    service = DiscoveryService(db)
    try:
        rows = await run_blocking(service.list_discovered, user_id, wifi_id)
    except UnknownScanNetworkError as exc:
        raise _unknown_network(str(exc)) from exc

    return success_response(
        [DiscoveredDeviceResponse.model_validate(row).model_dump(mode="json") for row in rows],
        message="Discovered devices retrieved",
    )


@router.delete("/discovered/{discovered_id}")
async def ignore_discovered(
    discovered_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Drop one observation from the list.

    It reappears if a later scan sees it again. That is deliberate: this is a
    record of what is on the network, not a list the admin curates.
    """
    service = DiscoveryService(db)
    try:
        await run_blocking(service.ignore, user_id, discovered_id)
    except UnknownScanNetworkError as exc:
        raise _unknown_network(str(exc)) from exc

    return success_response({}, message="Discovered device ignored")


@router.get("/{device_id}")
async def get_device(
    device_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return one device details."""
    service = DeviceService(db)
    try:
        device = await run_blocking(service.get_device, device_id)
    except LookupError as exc:
        raise _not_found() from exc

    _require_network_admin(device, user_id)
    return success_response(_serialize(device), message="Device retrieved")


@router.put("/{device_id}/heartbeat")
async def heartbeat(
    device_id: uuid.UUID,
    payload: HeartbeatRequest,
    _: None = Depends(require_device_access),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Record a heartbeat and broadcast any status change over WebSocket.

    Accepts either the owner's user token or the device token issued at guest
    registration, since guests must keep reporting status without an account.
    Either way the credential must match *this* device -- one device may never
    heartbeat on behalf of another.
    """
    service = DeviceService(db)
    try:
        await run_blocking(
            service.update_heartbeat, device_id, payload.battery_level, payload.wifi_mac
        )
        device = await run_blocking(service.get_device, device_id)
    except LookupError as exc:
        raise _not_found() from exc

    # Aimed at the network's admin: their dashboard is the only one entitled to
    # see this device, and an unaimed broadcast would leak it to every other
    # home connected to this process.
    await manager.broadcast_device_update(
        device_id,
        device.status,
        device.battery_level,
        audience=device.wifi_network.user_id,
    )

    return success_response(_serialize(device), message="Heartbeat recorded")


@router.delete("/{device_id}")
async def remove_device(
    device_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Unregister a device.

    The network admin may remove any device on their network, guests included
    -- that is the control that makes open auto-registration acceptable.
    """
    service = DeviceService(db)
    try:
        device = await run_blocking(service.get_device, device_id)
        _require_network_admin(device, user_id)
        await run_blocking(service.remove_device, device_id)
    except LookupError as exc:
        raise _not_found() from exc

    return success_response({}, message="Device removed")
