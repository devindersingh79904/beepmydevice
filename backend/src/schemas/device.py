"""Request and response contracts for device endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from src.utils.constants import (
    MAX_BATTERY_LEVEL,
    MIN_BATTERY_LEVEL,
    DeviceStatus,
    DeviceType,
)
from src.utils.validators import MAC_ADDRESS_PATTERN


def _validate_mac(value: str) -> str:
    """Reject a malformed MAC at the API edge.

    The WiFi MAC is the trust boundary for alert authorization, so a bad value
    is refused rather than normalised into something that might match a real
    network by accident.
    """
    if not MAC_ADDRESS_PATTERN.match(value):
        raise ValueError("must be a MAC address, e.g. 00:1A:2B:3C:4D:5E")
    return value


class DeviceRegisterRequest(BaseModel):
    """Body of POST /devices/register.

    Identical for owned and guest registrations. Which one happens is decided
    by whether the request carries a user token, not by anything in the body --
    a client cannot ask to be an owner.
    """

    device_name: str = Field(max_length=255)
    device_type: DeviceType
    device_os_version: str | None = Field(default=None, max_length=50)
    push_token: str = Field(max_length=500)
    wifi_mac: str
    network_name: str | None = Field(default=None, max_length=255)
    # Stable across reinstalls and token rotations, which the push token is
    # not. Optional: a client older than this field still registers through
    # the push-token path, it simply leaves a row behind when it reinstalls.
    install_id: str | None = Field(default=None, max_length=255)

    _check_mac = field_validator("wifi_mac")(_validate_mac)


class HeartbeatRequest(BaseModel):
    """Body of PUT /devices/{device_id}/heartbeat.

    Sent every HEARTBEAT_INTERVAL_SECONDS. wifi_mac is re-sent each time so the
    server can detect a device that has moved off the registered network.
    """

    battery_level: int | None = Field(default=None, ge=MIN_BATTERY_LEVEL, le=MAX_BATTERY_LEVEL)
    wifi_mac: str

    _check_mac = field_validator("wifi_mac")(_validate_mac)


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
    # Derived from Device.user_id being null. The dashboard shows a "Guest"
    # badge and disables the alert button when true.
    is_guest: bool


class DeviceRegisterResponse(BaseModel):
    """Result of POST /devices/register.

    ``device_token`` is returned only for a guest registration. It authorises
    that one device's heartbeat and nothing else -- an owned device uses its
    user's JWT instead and gets null here.
    """

    device_id: uuid.UUID
    is_guest: bool
    device_token: str | None = None
