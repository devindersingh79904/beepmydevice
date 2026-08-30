"""Device endpoints: /devices/*."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.middleware.auth_middleware import get_current_user_id
from src.schemas.device import DeviceRegisterRequest, HeartbeatRequest
from src.utils.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_NUMBER
from src.utils.logger import get_logger

logger = get_logger("device_routes")

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_device(
    payload: DeviceRegisterRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Register the calling device and attach it to its WiFi network."""
    raise NotImplementedError


@router.get("/list")
async def list_devices(
    page: int = Query(default=MIN_PAGE_NUMBER, ge=MIN_PAGE_NUMBER),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """List the caller devices on their current network, paginated."""
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
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Record a heartbeat and broadcast any status change over WebSocket."""
    raise NotImplementedError


@router.delete("/{device_id}")
async def remove_device(
    device_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Unregister a device."""
    raise NotImplementedError
