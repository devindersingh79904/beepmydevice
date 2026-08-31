"""Push delivery via Firebase Cloud Messaging and Apple APNs.

This module deliberately trips four pylint checks, disabled below:

* ``import-outside-toplevel`` -- the provider SDKs are optional and slow to
  import, so a deployment with no push configured never pays for them.
* ``broad-exception-caught`` -- a push provider failing must degrade to
  "this device was not reached", never propagate and fail the whole alert.
* ``global-statement`` / ``invalid-name`` -- the Firebase handle and the APNs
  provider token are process-wide caches; Firebase refuses a second
  ``initialize_app`` and Apple rate-limits token minting.
"""

# pylint: disable=import-outside-toplevel,broad-exception-caught
# pylint: disable=global-statement,invalid-name

import time
import uuid
from pathlib import Path

import httpx
from jose import jwt
from sqlalchemy.orm import Session

from src.config import settings
from src.models.device import Device
from src.utils.constants import (
    ALERT_NOTIFICATION_BODY,
    ALERT_NOTIFICATION_TITLE,
    PUSH_TIMEOUT_SECONDS,
    DeviceStatus,
    DeviceType,
)
from src.utils.logger import get_logger, log_exception

logger = get_logger("notification_service")

# Firebase's SDK keeps global state and refuses a second initialise_app(), so
# the handle is created once per process and reused.
_firebase_app = None

# APNs endpoints. Sandbox serves debug builds; a token minted for one is
# rejected by the other, which is the usual cause of "works in TestFlight only".
APNS_PRODUCTION_HOST = "https://api.push.apple.com"
APNS_SANDBOX_HOST = "https://api.sandbox.push.apple.com"

# Apple rejects a provider token older than an hour and rate-limits minting to
# once per 20 minutes, so one token is reused for most of its life.
APNS_TOKEN_LIFETIME_SECONDS = 45 * 60
APNS_PRIORITY_IMMEDIATE = "10"
HTTP_OK = 200

# Cached (token, minted_at) for the process.
_apns_token: tuple[str, float] | None = None


class NotificationService:
    """Adapter over the two push providers.

    Callers pass a device and a message; this service picks the provider from
    the device type. Keeping provider choice here means alert logic never
    branches on platform.

    Every method here blocks -- both SDKs are synchronous HTTP clients -- so
    callers must reach them through ``run_blocking`` or ``gather_with_limit``.
    """

    def __init__(self, db: Session | None = None) -> None:
        """Store the session used by the token-maintenance methods.

        Args:
            db: Request-scoped session. Only required by
                :meth:`handle_notification_failure` and :meth:`refresh_token`;
                pure sending needs no database access.
        """
        self._db = db

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
        if not push_token:
            logger.warning("Cannot send push: device has no token")
            return False

        if device_type == DeviceType.IOS.value:
            return self.send_apns_message(push_token, title, body)
        if device_type in {
            DeviceType.ANDROID.value,
            DeviceType.WINDOWS.value,
            DeviceType.MACOS.value,
        }:
            # Desktop clients register through Firebase as well; APNs is only
            # for iOS bundles.
            return self.send_firebase_message(push_token, title, body)

        logger.error(f"No push provider for device type {device_type}")
        return False

    def send_firebase_message(self, push_token: str, title: str, body: str) -> bool:
        """Send an Android notification through Firebase Cloud Messaging.

        Uses a high-priority data message so the app wakes and plays the alert
        sound even when backgrounded.
        """
        if not settings.firebase_enabled:
            logger.warning("Firebase is not configured; dropping Android push")
            return False

        try:
            from firebase_admin import messaging

            message = messaging.Message(
                token=push_token,
                notification=messaging.Notification(title=title, body=body),
                # Data payload as well as the notification: the app needs to
                # ring at full volume, which requires it to actually run.
                data={"type": "alert", "title": title, "body": body},
                android=messaging.AndroidConfig(
                    priority="high",
                    ttl=PUSH_TIMEOUT_SECONDS,
                ),
            )
            messaging.send(message, app=self._firebase())
            return True
        except Exception:
            log_exception(logger, "Firebase push failed", token=push_token[:12])
            return False

    def send_apns_message(self, push_token: str, title: str, body: str) -> bool:
        """Send an iOS notification through APNs using .p8 token authentication."""
        if not settings.apns_enabled:
            logger.warning("APNs is not configured; dropping iOS push")
            return False

        host = APNS_SANDBOX_HOST if settings.APPLE_USE_SANDBOX else APNS_PRODUCTION_HOST
        try:
            provider_token = self._apns_provider_token()
        except Exception:
            log_exception(logger, "Could not mint APNs provider token")
            return False

        payload = {
            "aps": {
                "alert": {"title": title, "body": body},
                "sound": "default",
                # The app must actually run to ring at full volume, so the
                # notification carries content-available alongside the alert.
                "content-available": 1,
            },
            "type": "alert",
        }

        try:
            # APNs is HTTP/2 only -- an HTTP/1.1 client is refused at the
            # connection, not with an error status.
            with httpx.Client(http2=True, timeout=PUSH_TIMEOUT_SECONDS) as client:
                response = client.post(
                    f"{host}/3/device/{push_token}",
                    json=payload,
                    headers={
                        "authorization": f"bearer {provider_token}",
                        "apns-topic": settings.APPLE_BUNDLE_ID,
                        "apns-push-type": "alert",
                        "apns-priority": APNS_PRIORITY_IMMEDIATE,
                    },
                )
        except Exception:
            log_exception(logger, "APNs push failed", token=push_token[:12])
            return False

        if response.status_code != HTTP_OK:
            logger.warning(
                f"APNs rejected push to {push_token[:12]}: "
                f"{response.status_code} {response.text}"
            )
            return False
        return True

    @staticmethod
    def _apns_provider_token() -> str:
        """Return a signed APNs provider token, minting one when stale."""
        global _apns_token
        now = time.time()
        if _apns_token is not None and now - _apns_token[1] < APNS_TOKEN_LIFETIME_SECONDS:
            return _apns_token[0]

        signing_key = Path(settings.APPLE_KEY_PATH).read_text(encoding="utf-8")
        token: str = jwt.encode(
            {"iss": settings.APPLE_TEAM_ID, "iat": int(now)},
            signing_key,
            algorithm="ES256",
            headers={"kid": settings.APPLE_KEY_ID},
        )
        _apns_token = (token, now)
        return token

    def send_alert_to(self, device: Device) -> bool:
        """Send the standard alert notification to one device."""
        return self.send(
            device.device_type,
            device.push_token or "",
            ALERT_NOTIFICATION_TITLE,
            ALERT_NOTIFICATION_BODY,
        )

    def handle_notification_failure(self, device_id: uuid.UUID) -> bool:
        """React to a rejected push.

        A token rejected as unregistered is stale, so clear it and mark the
        device offline rather than retrying, which would never succeed.
        """
        if self._db is None:
            raise RuntimeError("NotificationService needs a session to clear a token")

        device = self._db.get(Device, device_id)
        if device is None:
            return False

        device.push_token = None
        device.status = DeviceStatus.OFFLINE.value
        self._db.flush()
        logger.info(f"Cleared stale push token for device {device_id}")
        return True

    def refresh_token(self, device_id: uuid.UUID, new_token: str) -> bool:
        """Replace a device push token after the platform rotates it."""
        if self._db is None:
            raise RuntimeError("NotificationService needs a session to refresh a token")

        device = self._db.get(Device, device_id)
        if device is None:
            return False

        device.push_token = new_token
        self._db.flush()
        logger.info(f"Refreshed push token for device {device_id}")
        return True

    @staticmethod
    def _firebase() -> object:
        """Return the process-wide Firebase app, initialising it on first use."""
        global _firebase_app
        if _firebase_app is not None:
            return _firebase_app

        import firebase_admin
        from firebase_admin import credentials

        certificate = credentials.Certificate(
            {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
                # The key arrives from the environment with literal \n escapes.
                "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        )
        _firebase_app = firebase_admin.initialize_app(certificate)
        return _firebase_app
