"""Alert authorization, routing and audit logging."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.alert_log import AlertLog
from src.models.device import Device
from src.models.wifi_network import WiFiNetwork
from src.services.device_service import (
    effective_status,
    heartbeat_cutoff,
    is_alertable,
    owned_network_id,
)
from src.utils.constants import AlertStatus, DeviceStatus
from src.utils.logger import get_logger

logger = get_logger("alert_service")


class DifferentNetworksError(PermissionError):
    """Targets span more than one WiFi network (ALERT_001).

    These three subclass the exception types named in the method docstrings, so
    a caller that only cares "authorization failed" can still catch
    PermissionError or ValueError, while the route can map each cause onto its
    own error code instead of guessing from a message string.
    """


class NotNetworkAdminError(PermissionError):
    """The sender does not administer the target network (ALERT_003)."""


class NoReachableTargetsError(ValueError):
    """Nothing on the network can be alerted right now (ALERT_002)."""


class AlertService:
    """Decides whether an alert may be sent, then sends and records it.

    This is the security-critical service. Every send runs three checks in
    order and any failure aborts the whole request rather than partially
    delivering:

    1. Every target is on the sender's WiFi network.
    2. The sender owns that network (is its admin).
    3. Every target is reachable.

    Note what check 1 is *not*. Targets need not be owned by the sender --
    guest devices belong to no user at all, and alerting them is the point of
    guest access. Shared network membership, not ownership, is the boundary.
    Ownership is still required of the *sender*, which is what stops a guest
    sending: a guest holds only a device token and cannot authenticate here at
    all.
    """

    def __init__(self, db: Session) -> None:
        """Store the injected session.

        Args:
            db: Request-scoped database session.
        """
        self._db = db

    def send_alert(
        self,
        admin_user_id: uuid.UUID,
        device_ids: list[uuid.UUID],
    ) -> uuid.UUID:
        """Authorize, deliver and log an alert.

        An empty device_ids list targets every device on the sender network,
        guests included.

        Args:
            admin_user_id: The user requesting the alert. Must be the admin of
                the network the targets are on.
            device_ids: Target devices, or empty for all on the network. May
                include guest devices, which have no owner.

        Returns:
            The ID of the recorded alert.

        Raises:
            PermissionError: If the targets span multiple networks, or the
                sender is not the admin of the target network.
            ValueError: If there are no reachable targets.
        """
        wifi_id, targets = self.resolve_targets(admin_user_id, device_ids)
        return self.log_alert(
            admin_user_id,
            wifi_id,
            [target.device_id for target in targets],
            AlertStatus.SENT.value,
        )

    def resolve_targets(
        self,
        admin_user_id: uuid.UUID,
        device_ids: list[uuid.UUID],
    ) -> tuple[uuid.UUID, list[Device]]:
        """Run the three authorization checks and return the approved targets.

        Split out from :meth:`send_alert` so the route can push to the approved
        devices and report per-device delivery without authorizing twice.
        Authorization is all-or-nothing; only *push* outcomes are per-device.

        Returns:
            The network the alert is scoped to, and the devices to beep.

        Raises:
            PermissionError: If the targets span multiple networks, or the
                sender is not that network's admin.
            ValueError: If a named target cannot be alerted, or if a
                whole-network alert finds nothing reachable.
        """
        if device_ids:
            return self._resolve_named_targets(admin_user_id, device_ids)
        return self._resolve_network_targets(admin_user_id)

    def _resolve_named_targets(
        self,
        admin_user_id: uuid.UUID,
        device_ids: list[uuid.UUID],
    ) -> tuple[uuid.UUID, list[Device]]:
        """Authorize an explicit target list."""
        targets = list(
            self._db.execute(select(Device).where(Device.device_id.in_(device_ids))).scalars()
        )
        missing = set(device_ids) - {target.device_id for target in targets}
        if missing:
            raise NoReachableTargetsError(
                f"Unknown device(s): {sorted(str(item) for item in missing)}"
            )

        # Check 1 -- one network, or the proximity guarantee is void.
        wifi_ids = {target.wifi_id for target in targets}
        if len(wifi_ids) > 1:
            logger.warning(f"User {admin_user_id} tried to alert across {len(wifi_ids)} networks")
            raise DifferentNetworksError("All target devices must be on the same WiFi network")
        wifi_id = wifi_ids.pop()

        # Check 2 -- the sender administers that network.
        self._require_admin(admin_user_id, wifi_id)

        # Check 3 -- every *named* target is reachable. Naming an offline device
        # is a mistake worth reporting, not something to silently drop, and
        # dropping it would be the partial delivery this service does not do.
        # is_alertable, not the status column: a device that stopped speaking
        # still has ONLINE stored, and pushing at it would go nowhere.
        unreachable = [target for target in targets if not is_alertable(target)]
        if unreachable:
            names = ", ".join(
                f"{target.device_name or target.device_id} ({effective_status(target)})"
                for target in unreachable
            )
            raise NoReachableTargetsError(f"Device(s) cannot be alerted: {names}")
        return wifi_id, targets

    def _resolve_network_targets(self, admin_user_id: uuid.UUID) -> tuple[uuid.UUID, list[Device]]:
        """Authorize a whole-network alert.

        The caller named nobody, so the reachable subset is the intent and only
        an empty result is an error.
        """
        wifi_id = self._current_network(admin_user_id)
        self._require_admin(admin_user_id, wifi_id)
        # The heartbeat bound is applied in SQL as well as the status column:
        # a device that stopped speaking still has ONLINE stored, and alerting
        # it would attempt a push that cannot land.
        targets = list(
            self._db.execute(
                select(Device).where(
                    Device.wifi_id == wifi_id,
                    Device.status == DeviceStatus.ONLINE.value,
                    Device.last_heartbeat.is_not(None),
                    Device.last_heartbeat >= heartbeat_cutoff(),
                )
            ).scalars()
        )
        if not targets:
            raise NoReachableTargetsError("No devices on this network are currently reachable")
        return wifi_id, targets

    def _current_network(self, user_id: uuid.UUID) -> uuid.UUID:
        """Return the network this user is alerting on.

        Raises:
            ValueError: If the user administers no network.
        """
        wifi_id = owned_network_id(self._db, user_id)
        if wifi_id is None:
            raise NoReachableTargetsError("You do not have a registered WiFi network")
        return wifi_id

    def _require_admin(self, user_id: uuid.UUID, wifi_id: uuid.UUID) -> None:
        """Raise unless this user administers the network.

        Raises:
            PermissionError: If the user is not the network's admin.
        """
        if not self.verify_admin(user_id, wifi_id):
            logger.warning(f"User {user_id} is not admin of network {wifi_id}")
            raise NotNetworkAdminError("You do not administer this WiFi network")

    def verify_admin(self, user_id: uuid.UUID, wifi_id: uuid.UUID) -> bool:
        """Return True if this user owns the network and may alert on it.

        Since guests never hold a user token, this check is what makes guest
        send-access impossible rather than merely disabled in the UI.
        """
        owner_id = self._db.execute(
            select(WiFiNetwork.user_id).where(WiFiNetwork.wifi_id == wifi_id)
        ).scalar_one_or_none()
        return owner_id is not None and owner_id == user_id

    def verify_same_wifi(self, device_ids: list[uuid.UUID]) -> bool:
        """Return True if every target device shares one wifi_id.

        This is the proximity guarantee, and with guest devices in the mix it
        is the *only* membership check -- a guest has no owner to verify
        against, so shared network membership carries the whole boundary.
        """
        if not device_ids:
            return True
        distinct_networks = self._db.execute(
            select(func.count(func.distinct(Device.wifi_id))).where(
                Device.device_id.in_(device_ids)
            )
        ).scalar_one()
        return distinct_networks == 1

    def get_alert_logs(
        self,
        user_id: uuid.UUID,
        page: int,
        limit: int,
    ) -> tuple[list[AlertLog], int]:
        """List one user's past alerts, newest first.

        Returns:
            The page of alerts and the total count before pagination.
        """
        total = self._db.execute(
            select(func.count()).select_from(AlertLog).where(AlertLog.sender_user_id == user_id)
        ).scalar_one()

        alerts = list(
            self._db.execute(
                select(AlertLog)
                .where(AlertLog.sender_user_id == user_id)
                .order_by(AlertLog.created_at.desc())
                .offset((page - 1) * limit)
                .limit(limit)
            ).scalars()
        )
        return alerts, total

    def get_device_alert_logs(
        self,
        user_id: uuid.UUID,
        device_id: uuid.UUID,
        page: int,
        limit: int,
    ) -> tuple[list[AlertLog], int]:
        """List the alerts that targeted one device, newest first.

        Scoped by *network administration*, not ownership: a guest has no owner
        and the admin still needs to see what has been sent to it.

        Raises:
            LookupError: If no such device exists.
            PermissionError: If the caller does not administer its network.
        """
        device = self._db.get(Device, device_id)
        if device is None:
            raise LookupError(f"No device with ID {device_id}")
        self._require_admin(user_id, device.wifi_id)

        # target_devices holds IDs as text, which is how log_alert wrote them.
        targeted = AlertLog.target_devices.contains([str(device_id)])
        total = self._db.execute(
            select(func.count()).select_from(AlertLog).where(targeted)
        ).scalar_one()
        alerts = list(
            self._db.execute(
                select(AlertLog)
                .where(targeted)
                .order_by(AlertLog.created_at.desc())
                .offset((page - 1) * limit)
                .limit(limit)
            ).scalars()
        )
        return alerts, total

    def log_alert(
        self,
        sender_user_id: uuid.UUID,
        wifi_id: uuid.UUID,
        device_ids: list[uuid.UUID],
        status: str,
    ) -> uuid.UUID:
        """Write an audit record for one alert attempt."""
        alert = AlertLog(
            sender_user_id=sender_user_id,
            wifi_id=wifi_id,
            target_devices=[str(device_id) for device_id in device_ids],
            status=status,
        )
        self._db.add(alert)
        self._db.flush()
        logger.info(
            f"Alert {alert.alert_id} by {sender_user_id} on {wifi_id} "
            f"targeting {len(device_ids)} device(s): {status}"
        )
        return alert.alert_id
