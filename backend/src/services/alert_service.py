"""Alert authorization, routing and audit logging."""

import uuid

from sqlalchemy.orm import Session

from src.models.alert_log import AlertLog
from src.utils.logger import get_logger

logger = get_logger("alert_service")


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
        raise NotImplementedError

    def verify_admin(self, user_id: uuid.UUID, wifi_id: uuid.UUID) -> bool:
        """Return True if this user owns the network and may alert on it.

        Since guests never hold a user token, this check is what makes guest
        send-access impossible rather than merely disabled in the UI.
        """
        raise NotImplementedError

    def verify_same_wifi(self, device_ids: list[uuid.UUID]) -> bool:
        """Return True if every target device shares one wifi_id.

        This is the proximity guarantee, and with guest devices in the mix it
        is the *only* membership check -- a guest has no owner to verify
        against, so shared network membership carries the whole boundary.
        """
        raise NotImplementedError

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
        raise NotImplementedError

    def log_alert(
        self,
        sender_user_id: uuid.UUID,
        wifi_id: uuid.UUID,
        device_ids: list[uuid.UUID],
        status: str,
    ) -> uuid.UUID:
        """Write an audit record for one alert attempt."""
        raise NotImplementedError
