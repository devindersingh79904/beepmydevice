"""What a phone reported seeing on its WiFi network.

The scan itself runs on a client, never here. This API is a cloud relay: an
ARP or subnet scan executed in the datacenter enumerates the hosting
provider's network -- other tenants' machines -- and never sees the user's home
at all. So a device that is *on* the network does the looking, and this service
records what it says it found.

That makes every row in this table client-supplied. It is treated accordingly:
observations are display-only, carry no push token, and can never be alerted.
The only thing checked before writing is the one thing that matters -- that the
caller administers the network they claim to be describing.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from src.models.discovered_device import DiscoveredDevice
from src.models.wifi_network import WiFiNetwork
from src.schemas.discovery import DiscoveredDeviceInput
from src.utils.constants import DISCOVERY_RETENTION_HOURS
from src.utils.logger import get_logger
from src.utils.validators import normalize_mac_address

logger = get_logger("discovery_service")


class UnknownScanNetworkError(PermissionError):
    """The submitted scan names a network the caller does not administer.

    Subclasses PermissionError so a caller that only cares "authorization
    failed" can catch that, while the route maps the cause onto DEVICE_005.
    """


class DiscoveryService:
    """Records and reads WiFi scan observations."""

    def __init__(self, db: Session) -> None:
        """Store the request-scoped session.

        Args:
            db: SQLAlchemy session for this request.
        """
        self._db = db

    def record_scan(
        self,
        user_id: uuid.UUID,
        wifi_mac: str,
        observations: list[DiscoveredDeviceInput],
    ) -> int:
        """Replace what is known about a network with what a scan just saw.

        The network is resolved from the MAC the client reported and must
        already exist *and* belong to this user. It is deliberately not created
        here: registration owns that, and letting a scan submission mint a
        network would let any account claim any router by naming its MAC.

        Args:
            user_id: The caller, who must administer the network.
            wifi_mac: MAC of the network the scan describes.
            observations: What the client saw. Client-supplied and unverified.

        Returns:
            How many observations were recorded.

        Raises:
            UnknownScanNetworkError: If no network with this MAC is
                administered by this user.
        """
        wifi_id = self._require_admin(user_id, wifi_mac)
        self._drop_stale(wifi_id)

        seen: set[str] = set()
        recorded = 0
        for observation in observations:
            # A client can report the same address twice -- mDNS and the sweep
            # both find the router. The unique constraint would reject the
            # second within one flush, so they are collapsed here instead.
            if observation.ip_address in seen:
                continue
            seen.add(observation.ip_address)
            self._upsert(wifi_id, observation)
            recorded += 1

        self._db.flush()
        logger.info(f"Recorded {recorded} observation(s) on network {wifi_id}")
        return recorded

    def list_discovered(self, user_id: uuid.UUID, wifi_id: uuid.UUID) -> list[DiscoveredDevice]:
        """Return what has been seen on a network the caller administers.

        Args:
            user_id: The caller.
            wifi_id: Network to read.

        Returns:
            Observations, most recently seen first.

        Raises:
            UnknownScanNetworkError: If the caller does not administer it.
        """
        owns = self._db.execute(
            select(WiFiNetwork.wifi_id).where(
                WiFiNetwork.wifi_id == wifi_id, WiFiNetwork.user_id == user_id
            )
        ).scalar_one_or_none()
        if owns is None:
            raise UnknownScanNetworkError("You do not administer this WiFi network")

        return list(
            self._db.execute(
                select(DiscoveredDevice)
                .where(DiscoveredDevice.wifi_id == wifi_id)
                .order_by(DiscoveredDevice.last_seen.desc())
            ).scalars()
        )

    def ignore(self, user_id: uuid.UUID, discovered_id: uuid.UUID) -> bool:
        """Remove one observation.

        The admin saying they know what that is and want it out of the list. It
        comes back if a later scan sees it again, which is correct: this is a
        record of what is on the network, not a list the user curates.

        Args:
            user_id: The caller, who must administer the observation's network.
            discovered_id: Observation to remove.

        Returns:
            True if a row was removed.

        Raises:
            UnknownScanNetworkError: If the caller does not administer it.
        """
        row = self._db.execute(
            select(DiscoveredDevice)
            .join(WiFiNetwork, WiFiNetwork.wifi_id == DiscoveredDevice.wifi_id)
            .where(
                DiscoveredDevice.discovered_id == discovered_id,
                WiFiNetwork.user_id == user_id,
            )
        ).scalar_one_or_none()
        if row is None:
            # Not found and not-yours are one answer on purpose: distinguishing
            # them tells a caller whether an id exists on somebody else's
            # network.
            raise UnknownScanNetworkError("No such discovered device")

        self._db.delete(row)
        self._db.flush()
        return True

    def _require_admin(self, user_id: uuid.UUID, wifi_mac: str) -> uuid.UUID:
        """Resolve a reported MAC to a network this user administers."""
        normalized = normalize_mac_address(wifi_mac)
        wifi_id = self._db.execute(
            select(WiFiNetwork.wifi_id).where(
                WiFiNetwork.mac_address == normalized,
                WiFiNetwork.user_id == user_id,
            )
        ).scalar_one_or_none()
        if wifi_id is None:
            logger.warning(f"User {user_id} submitted a scan for unowned network {normalized}")
            raise UnknownScanNetworkError("You do not administer this WiFi network")
        return wifi_id

    def _drop_stale(self, wifi_id: uuid.UUID) -> None:
        """Forget observations old enough to be meaningless.

        A scan only reports what is switched on right now, so something
        unplugged last week is simply absent from every future scan and would
        otherwise sit in the dashboard forever.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=DISCOVERY_RETENTION_HOURS)
        self._db.execute(
            delete(DiscoveredDevice).where(
                DiscoveredDevice.wifi_id == wifi_id,
                DiscoveredDevice.last_seen < cutoff,
            )
        )

    def _upsert(self, wifi_id: uuid.UUID, observation: DiscoveredDeviceInput) -> None:
        """Record one observation, refreshing a row that already exists."""
        existing = self._db.execute(
            select(DiscoveredDevice).where(
                DiscoveredDevice.wifi_id == wifi_id,
                DiscoveredDevice.ip_address == observation.ip_address,
            )
        ).scalar_one_or_none()

        if existing is not None:
            existing.last_seen = datetime.now(timezone.utc)
            existing.discovered_via = observation.discovered_via.value
            # A later scan that learned a name should not be undone by an
            # earlier one that did not, so a null never overwrites a value.
            if observation.device_name is not None:
                existing.device_name = observation.device_name
            if observation.device_type is not None:
                existing.device_type = observation.device_type
            return

        self._db.add(
            DiscoveredDevice(
                wifi_id=wifi_id,
                ip_address=observation.ip_address,
                device_name=observation.device_name,
                device_type=observation.device_type,
                discovered_via=observation.discovered_via.value,
            )
        )
