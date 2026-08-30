"""Request and response contracts for device endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from src.utils.constants import (
    MAX_BATTERY_LEVEL,
    MIN_BATTERY_LEVEL,
    DeviceStatus,
    DeviceType,
)


class DeviceRegisterRequest(BaseModel):
    """Body of POST /devices/register."""

    device_name: str = Field(max_length=255)
    device_type: DeviceType
    device_os_version: str | None = Field(default=None, max_length=50)
    push_token: str = Field(max_length=500)
    wifi_mac: str
    network_name: str | None = Field(default=None, max_length=255)


class HeartbeatRequest(BaseModel):
    """Body of PUT /devices/{device_id}/heartbeat.

    Sent every HEARTBEAT_INTERVAL_SECONDS. wifi_mac is re-sent each time so the
    server can detect a device that has moved off the registered network.
    """

    battery_level: int | None = Field(
        default=None, ge=MIN_BATTERY_LEVEL, le=MAX_BATTERY_LEVEL
    )
    wifi_mac: str


class DeviceResponse(BaseModel):
    """Public view of a device. Never includes the push token."""

    model_config = {"from_attributes": True}

    device_id: uuid.UUID
    device_name: str | None
    device_type: DeviceType
    device_os_version: str | None
    battery_level: int | None
    status: DeviceStatus
    last_heartbeat: datetime | None
    created_at: datetime
