"""Device registration, heartbeat processing and status tracking."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from src.config import settings
from src.models.device import Device
from src.models.wifi_network import WiFiNetwork
from src.services.auth_service import TokenExpiredError, TokenInvalidError
from src.utils.constants import (
    GUEST_TOKEN_EXPIRE_DAYS,
    OFFLINE_THRESHOLD_SECONDS,
    DeviceStatus,
)
from src.utils.logger import get_logger
from src.utils.validators import normalize_mac_address

logger = get_logger("device_service")


def owned_network_id(db: Session, user_id: uuid.UUID) -> uuid.UUID | None:
    """Return the most recently claimed network this user administers.

    Shared with AlertService: "the network I own" is one question, and asking
    it two different ways in two services is how the answers drift apart.
    """
    return db.execute(
        select(WiFiNetwork.wifi_id)
        .where(WiFiNetwork.user_id == user_id)
        .order_by(WiFiNetwork.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()


class DeviceService:
    """Owns the device registry and its liveness state.

    Heartbeats are the only source of truth for whether a device is reachable
    and whether it is still on the network it registered against.

    This service also issues and verifies *device tokens*. Each service owns
    the credential it hands out: ``AuthService`` issues user tokens, and a
    device token is scoped to one ``device_id`` and authorises nothing but that
    device's heartbeat.
    """

    def __init__(self, db: Session) -> None:
        """Store the injected session.

        Args:
            db: Request-scoped database session.
        """
        self._db = db

    # -- registration -------------------------------------------------------

    def register_device(
        self,
        user_id: uuid.UUID | None,
        device_info: dict[str, Any],
    ) -> tuple[uuid.UUID, str | None]:
        """Register a device, creating its WiFi network row if it is new.

        Args:
            user_id: Owner of the device, or None to register a guest. A guest
                is attached to the WiFi network but to no account.
            device_info: Keys device_name, device_type, push_token, wifi_mac
                and optionally device_os_version.

        Returns:
            The new device ID, and a device token for a guest registration
            (None when the device is owned, since it uses its user's JWT).

        Raises:
            LookupError: If registering a guest against a wifi_mac that no
                account has claimed. A guest can only join an existing
                network -- otherwise the first device on an unknown MAC would
                create an ownerless network nobody could ever administer.
        """
        mac_address = normalize_mac_address(device_info["wifi_mac"])
        network = self._get_or_create_network(user_id, mac_address, device_info.get("network_name"))

        existing = self._find_reregistration(network.wifi_id, device_info["push_token"], user_id)
        if existing is not None:
            self._apply_device_info(existing, device_info)
            self._db.flush()
            logger.info(f"Device {existing.device_id} re-registered")
            return existing.device_id, self._issue_token_if_guest(existing)

        device = Device(
            user_id=user_id,
            wifi_id=network.wifi_id,
            status=DeviceStatus.ONLINE.value,
            last_heartbeat=datetime.now(timezone.utc),
        )
        self._apply_device_info(device, device_info)
        self._db.add(device)
        self._db.flush()

        logger.info(
            f"Registered {'guest' if user_id is None else 'owned'} device {device.device_id} "
            f"on network {network.wifi_id}"
        )
        return device.device_id, self._issue_token_if_guest(device)

    def _get_or_create_network(
        self,
        user_id: uuid.UUID | None,
        mac_address: str,
        network_name: str | None,
    ) -> WiFiNetwork:
        """Return the network for this MAC, creating it for an owned device.

        Raises:
            LookupError: If a guest names a MAC no account has claimed.
        """
        network = self._db.execute(
            select(WiFiNetwork).where(WiFiNetwork.mac_address == mac_address)
        ).scalar_one_or_none()

        if network is not None:
            return network

        if user_id is None:
            logger.warning(f"Guest registration rejected for unclaimed network {mac_address}")
            raise LookupError("No account has claimed this WiFi network")

        network = WiFiNetwork(
            user_id=user_id,
            mac_address=mac_address,
            network_name=network_name,
        )
        self._db.add(network)
        self._db.flush()
        logger.info(f"Created network {network.wifi_id} for {mac_address}")
        return network

    def _find_reregistration(
        self,
        wifi_id: uuid.UUID,
        push_token: str,
        user_id: uuid.UUID | None,
    ) -> Device | None:
        """Return the existing row this registration should update, if any.

        A push token identifies one app install, so a client that registers
        again -- after a reinstall, or because it lost its stored device ID --
        must update its row rather than leave a duplicate behind that the admin
        then sees twice in the dashboard.

        Ownership must match: a re-registration never converts an owned device
        into a guest or vice versa, since ownership is what authorises sending.
        """
        device = self._db.execute(
            select(Device).where(
                Device.wifi_id == wifi_id,
                Device.push_token == push_token,
            )
        ).scalar_one_or_none()

        if device is None or device.user_id != user_id:
            return None
        return device

    @staticmethod
    def _apply_device_info(device: Device, device_info: dict[str, Any]) -> None:
        """Copy the mutable registration fields onto a device row."""
        device.device_name = device_info.get("device_name")
        device.device_type = device_info["device_type"]
        device.device_os_version = device_info.get("device_os_version")
        device.push_token = device_info["push_token"]

    def _issue_token_if_guest(self, device: Device) -> str | None:
        """Return a device token for a guest, or None for an owned device."""
        if not device.is_guest:
            return None
        return self.create_device_token(device.device_id)

    # -- device tokens ------------------------------------------------------

    @staticmethod
    def create_device_token(device_id: uuid.UUID) -> str:
        """Sign a token authorising one device's own heartbeat.

        The ``device`` type claim is what stops this token being accepted
        anywhere a user token is required -- listing devices or sending an
        alert -- which is the mechanism behind "a guest cannot send".
        """
        issued_at = datetime.now(timezone.utc)
        claims = {
            "sub": str(device_id),
            "type": "device",
            "iat": issued_at,
            "exp": issued_at + timedelta(days=GUEST_TOKEN_EXPIRE_DAYS),
        }
        token: str = jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return token

    @staticmethod
    def verify_device_token(token: str) -> uuid.UUID:
        """Decode a device token and return the device it is scoped to.

        Raises:
            PermissionError: If the token is expired, malformed, or is not a
                device token.
        """
        try:
            claims = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except ExpiredSignatureError as exc:
            raise TokenExpiredError("Device token has expired") from exc
        except JWTError as exc:
            raise TokenInvalidError("Invalid device token") from exc

        if claims.get("type") != "device":
            raise TokenInvalidError("Token is not a device token")

        try:
            return uuid.UUID(claims.get("sub", ""))
        except ValueError as exc:
            raise TokenInvalidError("Token subject is not a device ID") from exc

    # -- queries ------------------------------------------------------------

    def get_devices(
        self,
        user_id: uuid.UUID,
        wifi_id: uuid.UUID,
        page: int,
        limit: int,
    ) -> tuple[list[Device], int]:
        """List every device on one network, paginated.

        Scoped by network rather than by owner: the admin sees guest devices
        too, since those are exactly the ones they may need to find. Callers
        must already have been confirmed as the network's admin.

        Returns:
            The page of devices and the total count before pagination.
        """
        total = self._db.execute(
            select(func.count()).select_from(Device).where(Device.wifi_id == wifi_id)
        ).scalar_one()

        # Reachable devices first: the list exists to be acted on, and an
        # ONLINE device is the only kind that can be.
        status_rank = case(
            (Device.status == DeviceStatus.ONLINE.value, 0),
            (Device.status == DeviceStatus.UNKNOWN.value, 1),
            else_=2,
        )
        devices = list(
            self._db.execute(
                select(Device)
                .where(Device.wifi_id == wifi_id)
                .order_by(status_rank, Device.device_name)
                .offset((page - 1) * limit)
                .limit(limit)
            ).scalars()
        )

        logger.debug(f"Listed {len(devices)}/{total} devices on {wifi_id} for user {user_id}")
        return devices, total

    def get_device(self, device_id: uuid.UUID) -> Device:
        """Fetch one device.

        Raises:
            LookupError: If no device has that ID.
        """
        device = self._db.get(Device, device_id)
        if device is None:
            raise LookupError(f"No device with ID {device_id}")
        return device

    def get_current_wifi_id(self, user_id: uuid.UUID) -> uuid.UUID:
        """Return the network this user is currently administering.

        Chosen as the network of their most recently active device, so a user
        who owns more than one network gets the one they are standing in
        rather than the one they registered first.

        Raises:
            LookupError: If the user has no devices and owns no network.
        """
        wifi_id = self._db.execute(
            select(Device.wifi_id)
            .where(Device.user_id == user_id)
            .order_by(Device.last_heartbeat.desc().nullslast())
            .limit(1)
        ).scalar_one_or_none()
        if wifi_id is not None:
            return wifi_id

        # A user who has registered a network but no device yet still has one
        # to administer -- for example straight after signing up on a new phone.
        wifi_id = owned_network_id(self._db, user_id)
        if wifi_id is None:
            raise LookupError("User has no registered network")
        return wifi_id

    def get_device_status(self, device_id: uuid.UUID) -> str:
        """Return the current status, derived from the last heartbeat time."""
        device = self.get_device(device_id)

        # UNKNOWN is a statement about *which network* the device is on, not
        # about how recently it spoke, so a fresh heartbeat never clears it
        # here -- only a heartbeat from the registered MAC does.
        if device.status == DeviceStatus.UNKNOWN.value:
            return DeviceStatus.UNKNOWN.value

        if device.last_heartbeat is None:
            return DeviceStatus.OFFLINE.value

        deadline = datetime.now(timezone.utc) - timedelta(seconds=OFFLINE_THRESHOLD_SECONDS)
        if device.last_heartbeat < deadline:
            return DeviceStatus.OFFLINE.value
        return device.status

    # -- mutations ----------------------------------------------------------

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
        device = self.get_device(device_id)
        reported_mac = normalize_mac_address(wifi_mac)
        registered_mac = device.wifi_network.mac_address

        on_registered_network = reported_mac == registered_mac
        device.status = (
            DeviceStatus.ONLINE.value if on_registered_network else DeviceStatus.UNKNOWN.value
        )
        device.last_heartbeat = datetime.now(timezone.utc)
        if battery_level is not None:
            device.battery_level = battery_level
        self._db.flush()

        if not on_registered_network:
            logger.warning(
                f"Device {device_id} reported MAC {reported_mac} but registered on "
                f"{registered_mac}; marked UNKNOWN and no longer alertable"
            )
        return True

    def set_offline(self, device_id: uuid.UUID) -> bool:
        """Mark a device offline after it misses its heartbeat window."""
        device = self.get_device(device_id)
        device.status = DeviceStatus.OFFLINE.value
        self._db.flush()
        logger.info(f"Device {device_id} marked offline")
        return True

    def remove_device(self, device_id: uuid.UUID) -> bool:
        """Delete a device and its stored push token."""
        device = self.get_device(device_id)
        self._db.delete(device)
        self._db.flush()
        logger.info(f"Removed device {device_id}")
        return True
