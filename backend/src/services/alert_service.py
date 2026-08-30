"""Alert authorization, routing and audit logging."""

import uuid

from sqlalchemy.orm import Session

from src.models.alert_log import AlertLog
from src.utils.logger import get_logger

logger = get_logger("alert_service")


class AlertService:
    """Decides whether an alert may be sent, then sends and records it.

    This is the security-critical service. Every send runs three checks in
    order (ownership, shared network, admin rights) and any failure aborts the
    whole request rather than partially delivering.
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

        An empty device_ids list targets every device on the sender network.

        Args:
            admin_user_id: The user requesting the alert.
            device_ids: Target devices, or empty for all on the network.

        Returns:
            The ID of the recorded alert.

        Raises:
            PermissionError: If the sender does not own a target, the targets
                span multiple networks, or the sender is not the admin.
            ValueError: If there are no reachable targets.
        """
        raise NotImplementedError

    def verify_admin(self, user_id: uuid.UUID, wifi_id: uuid.UUID) -> bool:
        """Return True if this user owns the network and may alert on it."""
        raise NotImplementedError

    def verify_same_wifi(self, device_ids: list[uuid.UUID]) -> bool:
        """Return True if every target device shares one wifi_id.

        This is the proximity guarantee: an alert can only reach devices on the
        same network as the sender.
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
