"""Alert endpoints: /alerts/*."""

import uuid
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.middleware.auth_middleware import get_current_user_id, get_sending_user_id
from src.models.device import Device
from src.schemas.alert import (
    AlertDeliveryStatus,
    AlertLogResponse,
    SendAlertRequest,
    SendAlertResponse,
)
from src.services.alert_service import (
    AlertService,
    DifferentNetworksError,
    NotNetworkAdminError,
)
from src.services.notification_service import NotificationService
from src.utils.concurrency import gather_with_limit, run_blocking
from src.utils.constants import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    MIN_PAGE_NUMBER,
    PUSH_MAX_CONCURRENT_SENDS,
    AlertStatus,
    ErrorCode,
)
from src.utils.logger import get_logger
from src.utils.responses import build_pagination, single_error_response, success_response

logger = get_logger("alert_routes")

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def _alert_error(code: ErrorCode, status_code: int, message: str) -> HTTPException:
    """Build an alert failure carrying the standard error envelope."""
    return HTTPException(
        status_code=status_code,
        detail=single_error_response(code, status_code, message=message),
    )


@router.post("/send")
async def send_alert(
    payload: SendAlertRequest,
    user_id: uuid.UUID = Depends(get_sending_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Beep the target devices.

    Returns per-device delivery status so the client can show which devices
    were reached and which failed, rather than one all-or-nothing result.
    """
    service = AlertService(db)

    # Authorization is all-or-nothing and happens before anything is sent.
    try:
        wifi_id, targets = await run_blocking(service.resolve_targets, user_id, payload.device_ids)
    except DifferentNetworksError as exc:
        raise _alert_error(
            ErrorCode.DIFFERENT_WIFI_NETWORKS, status.HTTP_400_BAD_REQUEST, str(exc)
        ) from exc
    except NotNetworkAdminError as exc:
        raise _alert_error(
            ErrorCode.PERMISSION_DENIED, status.HTTP_403_FORBIDDEN, str(exc)
        ) from exc
    except ValueError as exc:
        raise _alert_error(
            ErrorCode.NO_TARGET_DEVICES, status.HTTP_400_BAD_REQUEST, str(exc)
        ) from exc

    # Only *delivery* is per-device. Both push SDKs block, so the fan-out goes
    # through gather_with_limit rather than being awaited one at a time.
    notifier = NotificationService(db)
    results = await gather_with_limit(
        [_send_to(notifier, device) for device in targets],
        PUSH_MAX_CONCURRENT_SENDS,
    )

    delivery = [
        AlertDeliveryStatus(
            device_id=device.device_id,
            device_name=device.device_name,
            status=AlertStatus.SENT if delivered else AlertStatus.FAILED,
            error_code=None if delivered else ErrorCode.PUSH_NOTIFICATION_FAILED.value,
        )
        for device, delivered in zip(targets, results)
    ]

    # One device failing does not make the alert a failure; every device
    # failing does.
    overall = AlertStatus.SENT if any(result for result in results) else AlertStatus.FAILED
    alert_id = await run_blocking(
        service.log_alert,
        user_id,
        wifi_id,
        [device.device_id for device in targets],
        overall.value,
    )

    return success_response(
        SendAlertResponse(alert_id=alert_id, delivery_status=delivery).model_dump(mode="json"),
        message="Alert sent" if overall is AlertStatus.SENT else "Alert could not be delivered",
    )


def _send_to(notifier: NotificationService, device: Device) -> Callable[[], bool]:
    """Return a zero-argument callable that pushes to one device.

    Bound eagerly so ``gather_with_limit`` receives independent callables
    rather than a closure over a loop variable.
    """
    return lambda: notifier.send_alert_to(device)


@router.get("/logs")
async def get_alert_logs(
    page: int = Query(default=MIN_PAGE_NUMBER, ge=MIN_PAGE_NUMBER),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """List the caller past alerts, newest first."""
    service = AlertService(db)
    alerts, total = await run_blocking(service.get_alert_logs, user_id, page, limit)

    return success_response(
        [AlertLogResponse.model_validate(alert).model_dump(mode="json") for alert in alerts],
        message="Alert history retrieved",
        pagination=build_pagination(total, page, limit),
    )
