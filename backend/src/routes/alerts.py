"""Alert endpoints: /alerts/*."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.middleware.auth_middleware import get_current_user_id
from src.schemas.alert import SendAlertRequest
from src.utils.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_NUMBER
from src.utils.logger import get_logger

logger = get_logger("alert_routes")

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.post("/send")
async def send_alert(
    payload: SendAlertRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Beep the target devices.

    Returns per-device delivery status so the client can show which devices
    were reached and which failed, rather than one all-or-nothing result.
    """
    raise NotImplementedError


@router.get("/logs")
async def get_alert_logs(
    page: int = Query(default=MIN_PAGE_NUMBER, ge=MIN_PAGE_NUMBER),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """List the caller past alerts, newest first."""
    raise NotImplementedError
