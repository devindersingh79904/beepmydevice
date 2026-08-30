"""Device endpoints: /devices/*."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.middleware.auth_middleware import (
    get_current_user_id,
    get_optional_user_id,
    require_device_access,
)
from src.schemas.device import DeviceRegisterRequest, HeartbeatRequest
from src.utils.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_NUMBER
from src.utils.logger import get_logger

logger = get_logger("device_routes")

router = APIRouter(prefix="/devices", tags=["Devices"])


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
    raise NotImplementedError


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
    raise NotImplementedError


@router.get("/{device_id}")
async def get_device(
    device_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return one device details."""
    raise NotImplementedError


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
    raise NotImplementedError


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
    raise NotImplementedError
