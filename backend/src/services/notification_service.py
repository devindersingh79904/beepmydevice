"""Push delivery via Firebase Cloud Messaging and Apple APNs."""

import uuid

from src.utils.logger import get_logger

logger = get_logger("notification_service")


class NotificationService:
    """Adapter over the two push providers.

    Callers pass a device and a message; this service picks the provider from
    the device type. Keeping provider choice here means alert logic never
    branches on platform.
    """

    def send(self, device_type: str, push_token: str, title: str, body: str) -> bool:
        """Dispatch to the provider matching the device type.

        Args:
            device_type: One of the DeviceType values.
            push_token: Provider token stored at registration.
            title: Notification title.
            body: Notification body.

        Returns:
            True if the provider accepted the message.
        """
        raise NotImplementedError

    def send_firebase_message(self, push_token: str, title: str, body: str) -> bool:
        """Send an Android notification through Firebase Cloud Messaging.

        Uses a high-priority data message so the app wakes and plays the alert
        sound even when backgrounded.
        """
        raise NotImplementedError

    def send_apns_message(self, push_token: str, title: str, body: str) -> bool:
        """Send an iOS notification through APNs using .p8 token authentication."""
        raise NotImplementedError

    def handle_notification_failure(self, device_id: uuid.UUID) -> bool:
        """React to a rejected push.

        A token rejected as unregistered is stale, so clear it and mark the
        device offline rather than retrying, which would never succeed.
        """
        raise NotImplementedError

    def refresh_token(self, device_id: uuid.UUID, new_token: str) -> bool:
        """Replace a device push token after the platform rotates it."""
        raise NotImplementedError
