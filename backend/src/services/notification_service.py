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
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

import httpx
from jose import jwt
from sqlalchemy.orm import Session

from src.config import settings
from src.models.device import Device
from src.models.user import User
from src.utils.constants import (
    ALERT_NOTIFICATION_BODY,
    ALERT_NOTIFICATION_TITLE,
    ALERT_SOUND_RESOURCE,
    ALERT_VIBRATION_PATTERN_MS,
    ANDROID_CHANNEL_ALERT,
    ANDROID_CHANNEL_ALERT_SILENT_OVERRIDE,
    PUSH_MAX_RETRIES,
    PUSH_RETRY_BACKOFF_SECONDS,
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

# Bundled sound for a critical alert. Named without a path; the file must be in
# the app bundle, and `alert.wav` is the same asset Android plays from res/raw.
APNS_CRITICAL_SOUND = "alert.wav"
HTTP_OK = 200

# Cached (token, minted_at) for the process.
_apns_token: tuple[str, float] | None = None

# APNs replies that mean the token will never work again.
APNS_GONE = 410
APNS_DEAD_TOKEN_REASONS = {"BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"}


@dataclass(frozen=True)
class AlertStyle:
    """How one alert should present itself on the receiving device.

    Carried in the payload rather than read on the phone, because for the case
    this product exists for -- a phone nobody is holding -- the app is not
    running when the alert lands and has no opportunity to consult anything.

    Note the asymmetry, which is Android's and not ours. ``on_silent`` selects
    a notification channel and therefore governs every delivery. ``sound`` and
    ``vibration`` only reach the foreground path, where the app rings for
    itself: a channel's sound is frozen at creation and adjustable afterwards
    only by the user, in Android's own settings. An in-app toggle cannot mute
    a channel, so this one does not pretend to.
    """

    sound: bool = True
    vibration: bool = True
    on_silent: bool = False

    def as_data(self) -> dict[str, str]:
        """Render for an FCM data block, whose values must be strings."""
        return {
            "sound": _flag(self.sound),
            "vibration": _flag(self.vibration),
            "alert_on_silent": _flag(self.on_silent),
        }

    @classmethod
    def for_owner(cls, owner: User | None) -> "AlertStyle":
        """Read the preferences of the device's owner, if it has one.

        A guest belongs to nobody, so there is no preference to read -- and the
        network admin does not get to decide that a stranger's phone should
        override its own silent switch.
        """
        if owner is None:
            return cls()
        return cls(
            sound=owner.sound_enabled,
            vibration=owner.vibration_enabled,
            on_silent=owner.alert_on_silent,
        )


def _flag(value: bool) -> str:
    """FCM data values are strings; a JSON boolean does not survive the trip."""
    return "true" if value else "false"


class PushOutcome(str, Enum):
    """Why a push did or did not land.

    A plain boolean cannot carry the distinction the retry rules need: a
    provider that is briefly unavailable should be tried again, while a token
    the provider has never heard of should be cleared and never retried,
    because no number of attempts will make it valid.
    """

    DELIVERED = "DELIVERED"
    TOKEN_INVALID = "TOKEN_INVALID"
    TRANSIENT_FAILURE = "TRANSIENT_FAILURE"
    # Not sent because the owner asked not to be. Distinct from TOKEN_INVALID
    # because the caller *clears the push token* on that one: reporting a
    # switched-off preference as a dead token deletes a perfectly good token
    # and marks the device offline, so turning notifications back on would
    # never restore delivery.
    SUPPRESSED = "SUPPRESSED"


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

    def send(
        self,
        device_type: str,
        push_token: str,
        title: str,
        body: str,
        style: "AlertStyle | None" = None,
    ) -> PushOutcome:
        """Dispatch to the provider matching the device type.

        Args:
            device_type: One of the DeviceType values.
            push_token: Provider token stored at registration.
            title: Notification title.
            body: Notification body.
            style: How the alert should present itself. Decided *here*, at send
                time, because it is carried in the payload -- the receiving app
                cannot upgrade a notification after the fact, and usually is
                not running to try. Defaults to the plain presentation.

        Returns:
            Whether the message landed, and if not, whether retrying could help.
        """
        if not push_token:
            # No token is a permanent condition for this device, not a blip.
            logger.warning("Cannot send push: device has no token")
            return PushOutcome.TOKEN_INVALID

        if device_type == DeviceType.IOS.value:
            return self.send_apns_message(push_token, title, body, style)
        if device_type in {
            DeviceType.ANDROID.value,
            DeviceType.WINDOWS.value,
            DeviceType.MACOS.value,
        }:
            # Desktop clients register through Firebase as well; APNs is only
            # for iOS bundles.
            return self.send_firebase_message(push_token, title, body, style)

        logger.error(f"No push provider for device type {device_type}")
        return PushOutcome.TOKEN_INVALID

    def send_firebase_message(
        self,
        push_token: str,
        title: str,
        body: str,
        style: "AlertStyle | None" = None,
    ) -> PushOutcome:
        """Send an Android notification through Firebase Cloud Messaging.

        The notification block matters more than it looks. When the app is
        backgrounded or dead -- which is the whole point of this product, since
        nobody is holding the phone they have lost -- the app never runs and
        *Android* draws the notification and plays the sound. What it plays is
        decided entirely by the channel named here, so an alert posted without
        a channel id lands on Firebase's fallback channel, which has no sound
        and no vibration. That failure looks exactly like a push that was never
        sent.

        The data block is kept as well, for the case where the app *is* in the
        foreground: then no system notification is drawn at all and the JS
        handler does the ringing itself.
        """
        if not settings.firebase_enabled:
            logger.warning("Firebase is not configured; dropping Android push")
            return PushOutcome.TRANSIENT_FAILURE

        from firebase_admin import messaging

        style = style or AlertStyle()
        channel = (
            ANDROID_CHANNEL_ALERT_SILENT_OVERRIDE if style.on_silent else ANDROID_CHANNEL_ALERT
        )
        try:
            message = messaging.Message(
                token=push_token,
                notification=messaging.Notification(title=title, body=body),
                # The foreground handler rings by itself and reads its
                # instructions from here; the channel above governs every other
                # case, where no JavaScript runs at all.
                data={"type": "alert", "title": title, "body": body, **style.as_data()},
                android=messaging.AndroidConfig(
                    priority="high",
                    ttl=PUSH_TIMEOUT_SECONDS,
                    notification=messaging.AndroidNotification(
                        channel_id=channel,
                        # Honoured only below Android 8; from Oreo on, the
                        # channel owns the sound and this is ignored. Both are
                        # set so one build covers the whole supported range.
                        sound=ALERT_SOUND_RESOURCE,
                        default_vibrate_timings=False,
                        vibrate_timings_millis=ALERT_VIBRATION_PATTERN_MS,
                        priority="max",
                        # Readable on the lock screen: the person looking for
                        # the phone is the one who will see it there.
                        visibility="public",
                    ),
                ),
            )
            messaging.send(message, app=self._firebase())
            return PushOutcome.DELIVERED
        except (messaging.UnregisteredError, messaging.SenderIdMismatchError):
            # The token names an install that no longer exists, or belongs to a
            # different sender. Retrying cannot fix either.
            logger.warning(f"Firebase rejected token {push_token[:12]} as dead")
            return PushOutcome.TOKEN_INVALID
        except Exception:
            log_exception(logger, "Firebase push failed", token=push_token[:12])
            return PushOutcome.TRANSIENT_FAILURE

    def send_apns_message(
        self,
        push_token: str,
        title: str,
        body: str,
        style: "AlertStyle | None" = None,
    ) -> PushOutcome:
        """Send an iOS notification through APNs using .p8 token authentication.

        The silent-override path uses a critical alert, which is the only way
        iOS will make a sound through the ring/silent switch and Focus. Apple
        gates that behind an entitlement granted by request, so an app without
        it gets an ordinary alert and no error; the caller therefore cannot
        treat a DELIVERED here as proof the phone was audible.
        """
        if not settings.apns_enabled:
            logger.warning("APNs is not configured; dropping iOS push")
            return PushOutcome.TRANSIENT_FAILURE

        host = APNS_SANDBOX_HOST if settings.APPLE_USE_SANDBOX else APNS_PRODUCTION_HOST
        try:
            provider_token = self._apns_provider_token()
        except Exception:
            log_exception(logger, "Could not mint APNs provider token")
            return PushOutcome.TRANSIENT_FAILURE

        style = style or AlertStyle()
        sound: dict[str, object] | str = "default"
        if style.on_silent:
            # `critical: 1` is what bypasses the silent switch; the volume is
            # the app's, not the system's, so it is set explicitly at full.
            sound = {"critical": 1, "name": APNS_CRITICAL_SOUND, "volume": 1.0}

        payload: dict[str, object] = {
            "aps": {
                "alert": {"title": title, "body": body},
                "sound": sound,
                # The app must actually run to ring at full volume, so the
                # notification carries content-available alongside the alert.
                "content-available": 1,
                "interruption-level": "critical" if style.on_silent else "time-sensitive",
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
            return PushOutcome.TRANSIENT_FAILURE

        return self._classify_apns_response(response, push_token)

    @staticmethod
    def _classify_apns_response(response: httpx.Response, push_token: str) -> PushOutcome:
        """Turn an APNs reply into an outcome.

        Apple distinguishes "this token is gone" from "try again later" by
        status and a `reason` string. Conflating them means either retrying
        forever against a deleted app, or throwing away a good token over a blip.
        """
        if response.status_code == HTTP_OK:
            return PushOutcome.DELIVERED

        try:
            reason = response.json().get("reason", "")
        except Exception:  # pylint: disable=broad-exception-caught
            reason = ""

        if response.status_code == APNS_GONE or reason in APNS_DEAD_TOKEN_REASONS:
            logger.warning(f"APNs rejected token {push_token[:12]} as dead: {reason}")
            return PushOutcome.TOKEN_INVALID

        logger.warning(f"APNs rejected push to {push_token[:12]}: {response.status_code} {reason}")
        return PushOutcome.TRANSIENT_FAILURE

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

    def send_alert_to(self, device: Device) -> PushOutcome:
        """Send the standard alert notification to one device, with retries.

        Honours the owner's notification preferences: a user who switched alerts
        off is not pushed to, which is what makes the settings toggle mean
        something rather than only greying itself out, and a user who asked for
        alerts on silent gets the channel that overrides the ringer switch. A
        guest device has no owner and so is unaffected by anyone's preferences.

        A transient failure is retried with a widening gap, because the usual
        cause is the provider being briefly unavailable. A rejected *token* is
        never retried -- no number of attempts makes a dead token live.
        """
        owner = device.user
        if owner is not None and not owner.notifications_enabled:
            logger.info(f"Skipping push to {device.device_id}: owner has notifications off")
            return PushOutcome.SUPPRESSED

        style = AlertStyle.for_owner(owner)

        outcome = PushOutcome.TRANSIENT_FAILURE
        for attempt in range(PUSH_MAX_RETRIES):
            outcome = self.send(
                device.device_type,
                device.push_token or "",
                ALERT_NOTIFICATION_TITLE,
                ALERT_NOTIFICATION_BODY,
                style,
            )
            if outcome is not PushOutcome.TRANSIENT_FAILURE:
                return outcome

            remaining = PUSH_MAX_RETRIES - attempt - 1
            if remaining:
                delay = PUSH_RETRY_BACKOFF_SECONDS * (attempt + 1)
                logger.info(
                    f"Retrying push to {device.device_id} in {delay}s "
                    f"({remaining} attempt(s) left)"
                )
                # Blocking, deliberately: this runs in a worker thread via
                # gather_with_limit, never on the event loop.
                time.sleep(delay)

        return outcome

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
