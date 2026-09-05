"""Application-wide constants.

Every magic number and string literal used for control flow lives here. Nothing
in this module reads the environment — see ``src.config`` for anything that
varies per deployment.
"""

from enum import Enum
from typing import Final

# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------
DEFAULT_PAGE_SIZE: Final[int] = 20
MAX_PAGE_SIZE: Final[int] = 100
MIN_PAGE_NUMBER: Final[int] = 1
DESCENDING_SORT_PREFIX: Final[str] = "-"

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
JWT_EXPIRATION_DAYS: Final[int] = 30
BCRYPT_ROUNDS: Final[int] = 12
MIN_PASSWORD_LENGTH: Final[int] = 8
MAX_PASSWORD_LENGTH: Final[int] = 128
AUTH_SCHEME: Final[str] = "Bearer"

# ---------------------------------------------------------------------------
# Guest devices
#
# A guest auto-registers with no account. It gets a device-scoped token that
# authorises only its own heartbeat -- never listing, never alerting -- so a
# guest can be present on the network without being able to act on it.
# ---------------------------------------------------------------------------
GUEST_TOKEN_EXPIRE_DAYS: Final[int] = 30
# A reset link is emailed, so it lives long enough to be read but not long
# enough to sit useful in an inbox.
PASSWORD_RESET_EXPIRE_MINUTES: Final[int] = 60
PASSWORD_RESET_TOKEN_BYTES: Final[int] = 32
GUEST_DEVICE_NAME_FALLBACK: Final[str] = "Unknown device"

# ---------------------------------------------------------------------------
# Device heartbeat
#
# A device is considered offline once it has missed roughly three heartbeats.
# ---------------------------------------------------------------------------
HEARTBEAT_INTERVAL_SECONDS: Final[int] = 30
HEARTBEAT_GRACE_MULTIPLIER: Final[int] = 3
OFFLINE_THRESHOLD_SECONDS: Final[int] = HEARTBEAT_INTERVAL_SECONDS * HEARTBEAT_GRACE_MULTIPLIER
MIN_BATTERY_LEVEL: Final[int] = 0
MAX_BATTERY_LEVEL: Final[int] = 100

# ---------------------------------------------------------------------------
# Push notifications
# ---------------------------------------------------------------------------
PUSH_MAX_RETRIES: Final[int] = 3
PUSH_RETRY_BACKOFF_SECONDS: Final[int] = 2
PUSH_TIMEOUT_SECONDS: Final[int] = 10
# Ceiling on simultaneous provider connections when fanning out one alert.
# A busy network can hold dozens of devices; sending to all at once would open
# one connection per device to Firebase or APNs.
PUSH_MAX_CONCURRENT_SENDS: Final[int] = 10
ALERT_NOTIFICATION_TITLE: Final[str] = "BeepMyDevice"
ALERT_NOTIFICATION_BODY: Final[str] = "Someone is looking for this device!"

# Android notification channels. These ids must match the ones the app creates
# in MainApplication.kt exactly -- posting to an id the app never declared
# leaves the notification on the low-importance fallback channel, which is the
# difference between a phone that rings and a phone that shows a silent line in
# the shade. They are a wire contract, so treat them like the error codes:
# append, never rename.
#
# Two channels rather than one flag, because Android freezes a channel's
# importance and audio attributes when it is created and ignores every later
# change. The silent-override channel plays on the alarm stream, which the
# ringer switch does not mute.
ANDROID_CHANNEL_ALERT: Final[str] = "beepmydevice.alerts.v1"
ANDROID_CHANNEL_ALERT_SILENT_OVERRIDE: Final[str] = "beepmydevice.alerts.critical.v1"

# Base name of res/raw/alert.wav, which is how both the channel and the pre-Oreo
# notification payload name a bundled sound: no path, no extension.
ALERT_SOUND_RESOURCE: Final[str] = "alert"

# Vibration pattern in milliseconds, alternating wait and buzz. Matches the
# channels declared in AlertChannels.kt and ALERT_VIBRATION_PATTERN in the app,
# so an alert feels the same however it arrives.
ALERT_VIBRATION_PATTERN_MS: Final[list[int]] = [0, 500, 200, 500, 200, 500]

# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
# How long a freshly accepted socket may take to send its auth frame. The
# handshake completes before the token arrives, so without a bound an
# unauthenticated client can hold a connection open indefinitely by simply
# never speaking -- and each one costs a socket and a slot in the registry.
WS_AUTH_TIMEOUT_SECONDS: Final[int] = 10

# ---------------------------------------------------------------------------
# HTTP headers
# ---------------------------------------------------------------------------
CORRELATION_ID_HEADER: Final[str] = "X-Correlation-ID"
AUTHORIZATION_HEADER: Final[str] = "Authorization"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
SLOW_REQUEST_THRESHOLD_MS: Final[int] = 1000
LOG_FORMAT: Final[
    str
] = "[%(asctime)s] [%(levelname)s] [%(correlation_id)s] [%(service)s] %(message)s"
LOG_DATE_FORMAT: Final[str] = "%Y-%m-%dT%H:%M:%S"
NO_CORRELATION_ID: Final[str] = "no-correlation-id"


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------
class DeviceType(str, Enum):
    """Platform a registered device runs on."""

    IOS = "ios"
    ANDROID = "android"
    WINDOWS = "windows"
    MACOS = "macos"


class DeviceStatus(str, Enum):
    """Current reachability of a device.

    ``UNKNOWN`` is set when a heartbeat arrives from a WiFi network other than
    the one the device registered on — the device is reachable but can no
    longer be treated as part of the alert group.
    """

    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    UNKNOWN = "UNKNOWN"


class AlertStatus(str, Enum):
    """Delivery state of an alert."""

    SENT = "SENT"
    RECEIVED = "RECEIVED"
    FAILED = "FAILED"


class ErrorCode(str, Enum):
    """Stable error vocabulary returned to clients.

    The frontend branches on the prefix: ``AUTH_*`` redirects to login,
    ``VAL_*`` highlights form fields, everything else shows a dismissible
    banner. Codes are part of the API contract — never renumber them.
    """

    # Authentication
    INVALID_CREDENTIALS = "AUTH_001"
    TOKEN_EXPIRED = "AUTH_002"
    TOKEN_INVALID = "AUTH_003"
    UNAUTHORIZED = "AUTH_004"

    # Device
    DEVICE_NOT_FOUND = "DEVICE_001"
    DEVICE_OFFLINE = "DEVICE_002"
    INVALID_DEVICE_TYPE = "DEVICE_003"
    DEVICE_ALREADY_REGISTERED = "DEVICE_004"

    # Alert
    DIFFERENT_WIFI_NETWORKS = "ALERT_001"
    NO_TARGET_DEVICES = "ALERT_002"
    PERMISSION_DENIED = "ALERT_003"
    PUSH_NOTIFICATION_FAILED = "ALERT_004"
    GUEST_CANNOT_SEND = "ALERT_005"

    # Validation
    MISSING_REQUIRED_FIELD = "VAL_001"
    INVALID_FIELD_FORMAT = "VAL_002"
    INVALID_EMAIL_FORMAT = "VAL_003"
    PASSWORD_TOO_WEAK = "VAL_004"

    # Infrastructure
    DATABASE_ERROR = "DB_001"
    PUSH_SERVICE_UNAVAILABLE = "PUSH_001"
    INTERNAL_ERROR = "SYS_001"


# User-facing text for each error code. Kept separate from the enum so wording
# can change without touching the codes clients depend on.
ERROR_MESSAGES: Final[dict[ErrorCode, str]] = {
    ErrorCode.INVALID_CREDENTIALS: "Invalid email or password",
    ErrorCode.TOKEN_EXPIRED: "Your session has expired, please log in again",
    ErrorCode.TOKEN_INVALID: "Invalid authentication token",
    ErrorCode.UNAUTHORIZED: "You are not authorized to perform this action",
    ErrorCode.DEVICE_NOT_FOUND: "Device not found",
    ErrorCode.DEVICE_OFFLINE: "Device is currently offline",
    ErrorCode.INVALID_DEVICE_TYPE: "Unsupported device type",
    ErrorCode.DEVICE_ALREADY_REGISTERED: "This device is already registered",
    ErrorCode.DIFFERENT_WIFI_NETWORKS: "All devices must be on the same WiFi network",
    ErrorCode.NO_TARGET_DEVICES: "No devices available to alert",
    ErrorCode.PERMISSION_DENIED: "You do not have permission to alert this device",
    ErrorCode.PUSH_NOTIFICATION_FAILED: "Could not deliver the alert",
    ErrorCode.GUEST_CANNOT_SEND: (
        "Guest devices can receive alerts but cannot send them. "
        "Sign in as the network owner to send alerts."
    ),
    ErrorCode.MISSING_REQUIRED_FIELD: "This field is required",
    ErrorCode.INVALID_FIELD_FORMAT: "This field has an invalid format",
    ErrorCode.INVALID_EMAIL_FORMAT: "Please enter a valid email address",
    ErrorCode.PASSWORD_TOO_WEAK: (f"Password must be at least {MIN_PASSWORD_LENGTH} characters"),
    ErrorCode.DATABASE_ERROR: "A database error occurred",
    ErrorCode.PUSH_SERVICE_UNAVAILABLE: "Push notification service is unavailable",
    ErrorCode.INTERNAL_ERROR: "An unexpected error occurred",
}
