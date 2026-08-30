"""Device registration, heartbeat processing and status tracking."""

import uuid
from typing import Any

from sqlalchemy.orm import Session

from src.models.device import Device
from src.utils.logger import get_logger

logger = get_logger("device_service")


class DeviceService:
    """Owns the device registry and its liveness state.

    Heartbeats are the only source of truth for whether a device is reachable
    and whether it is still on the network it registered against.
    """

    def __init__(self, db: Session) -> None:
        """Store the injected session.

        Args:
            db: Request-scoped database session.
        """
        self._db = db

    def register_device(self, user_id: uuid.UUID, device_info: dict[str, Any]) -> uuid.UUID:
        """Register a device, creating its WiFi network row if it is new.

        Args:
            user_id: Owner of the device.
            device_info: Keys device_name, device_type, push_token, wifi_mac
                and optionally device_os_version.

        Returns:
            The new device ID.
        """
        raise NotImplementedError

    def get_devices(
        self,
        user_id: uuid.UUID,
        wifi_id: uuid.UUID,
        page: int,
        limit: int,
    ) -> tuple[list[Device], int]:
        """List one user's devices on one network, paginated.

        Returns:
            The page of devices and the total count before pagination.
        """
        raise NotImplementedError

    def get_device(self, device_id: uuid.UUID) -> Device:
        """Fetch one device.

        Raises:
            LookupError: If no device has that ID.
        """
        raise NotImplementedError

    def update_heartbeat(
        self,
        device_id: uuid.UUID,
        battery_level: int | None,
        wifi_mac: str,
    ) -> bool:
        """Record a heartbeat and recompute the device status.

        Sets status ONLINE when wifi_mac matches the network the device
        registered on. A mismatch means the device moved to another network and
        can no longer be alerted as part of this group, so the status becomes
        UNKNOWN rather than ONLINE.

        Returns:
            True if the heartbeat was recorded.
        """
        raise NotImplementedError

    def set_offline(self, device_id: uuid.UUID) -> bool:
        """Mark a device offline after it misses its heartbeat window."""
        raise NotImplementedError

    def remove_device(self, device_id: uuid.UUID) -> bool:
        """Delete a device and its stored push token."""
        raise NotImplementedError

    def get_device_status(self, device_id: uuid.UUID) -> str:
        """Return the current status, derived from the last heartbeat time."""
        raise NotImplementedError
