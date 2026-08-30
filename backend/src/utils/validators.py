"""Reusable input validators.

These back the Pydantic schemas in ``src.schemas`` and are also callable
directly from services. Each returns an error entry (or ``None``) rather than
raising, so a caller can accumulate every failure for one field-by-field
response instead of stopping at the first problem.
"""

import re
from typing import Any

from src.utils.constants import (
    MAX_BATTERY_LEVEL,
    MAX_PASSWORD_LENGTH,
    MIN_BATTERY_LEVEL,
    MIN_PASSWORD_LENGTH,
    DeviceType,
    ErrorCode,
)
from src.utils.responses import build_error

EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
MAC_ADDRESS_PATTERN = re.compile(r"^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$")


def validate_email(email: str) -> dict[str, Any] | None:
    """Return an error entry if ``email`` is not a valid address, else ``None``."""
    if not email:
        return build_error(ErrorCode.MISSING_REQUIRED_FIELD, field="email")
    if not EMAIL_PATTERN.match(email):
        return build_error(ErrorCode.INVALID_EMAIL_FORMAT, field="email")
    return None


def validate_password(password: str) -> dict[str, Any] | None:
    """Return an error entry if ``password`` fails the strength rules."""
    if not password:
        return build_error(ErrorCode.MISSING_REQUIRED_FIELD, field="password")
    if not MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH:
        return build_error(ErrorCode.PASSWORD_TOO_WEAK, field="password")
    return None


def validate_mac_address(mac_address: str, field: str = "wifi_mac") -> dict[str, Any] | None:
    """Return an error entry if ``mac_address`` is not a valid MAC.

    The WiFi MAC is the trust boundary for alert authorization, so a
    malformed value is rejected at the API edge rather than normalised.
    """
    if not mac_address:
        return build_error(ErrorCode.MISSING_REQUIRED_FIELD, field=field)
    if not MAC_ADDRESS_PATTERN.match(mac_address):
        return build_error(ErrorCode.INVALID_FIELD_FORMAT, field=field)
    return None


def validate_device_type(device_type: str) -> dict[str, Any] | None:
    """Return an error entry if ``device_type`` is not a supported platform."""
    if device_type not in {member.value for member in DeviceType}:
        return build_error(ErrorCode.INVALID_DEVICE_TYPE, field="device_type")
    return None


def validate_battery_level(battery_level: int | None) -> dict[str, Any] | None:
    """Return an error entry if ``battery_level`` is outside 0-100.

    ``None`` is allowed — desktop platforms may not report a battery.
    """
    if battery_level is None:
        return None
    if not MIN_BATTERY_LEVEL <= battery_level <= MAX_BATTERY_LEVEL:
        return build_error(ErrorCode.INVALID_FIELD_FORMAT, field="battery_level")
    return None


def normalize_mac_address(mac_address: str) -> str:
    """Normalise a MAC to uppercase colon-separated form for storage/comparison."""
    return mac_address.replace("-", ":").upper()
