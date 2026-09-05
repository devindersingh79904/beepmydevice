/**
 * Application-wide constants.
 *
 * Every magic number lives here. Values marked "must match backend" have a
 * counterpart in `backend/src/utils/constants.py` and must be changed together.
 */

// --- Pagination (must match backend) ----------------------------------------
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const FIRST_PAGE = 1;

// --- Timing -----------------------------------------------------------------
/** Heartbeat cadence. Must match HEARTBEAT_INTERVAL_SECONDS on the backend. */
export const HEARTBEAT_INTERVAL_MS = 30_000;
/** How long an error banner stays on screen before dismissing itself. */
export const ERROR_AUTO_CLOSE_MS = 5_000;
export const API_TIMEOUT_MS = 10_000;

// --- WebSocket reconnection -------------------------------------------------
export const WS_RECONNECT_BASE_DELAY_MS = 1_000;
export const WS_RECONNECT_MAX_DELAY_MS = 30_000;
export const WS_MAX_RECONNECT_ATTEMPTS = 10;

// --- Validation (must match backend) ----------------------------------------
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

// --- Battery thresholds for the indicator colour ----------------------------
export const BATTERY_LOW_THRESHOLD = 20;
export const BATTERY_MEDIUM_THRESHOLD = 50;
export const BATTERY_FULL = 100;

// --- HTTP headers -----------------------------------------------------------
export const CORRELATION_ID_HEADER = 'X-Correlation-ID';
export const AUTHORIZATION_HEADER = 'Authorization';

// --- AsyncStorage keys ------------------------------------------------------
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@beepmydevice/auth_token',
  USER: '@beepmydevice/user',
  DEVICE_ID: '@beepmydevice/device_id',
  CORRELATION_ID: '@beepmydevice/correlation_id',
} as const;

// --- API paths --------------------------------------------------------------
export const API_ROUTES = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  CHANGE_PASSWORD: '/auth/change-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  PREFERENCES: '/auth/preferences',
  DEVICE_REGISTER: '/devices/register',
  DEVICE_LIST: '/devices/list',
  DEVICE_DETAIL: (id: string): string => `/devices/${id}`,
  DEVICE_HEARTBEAT: (id: string): string => `/devices/${id}/heartbeat`,
  DEVICE_SCAN: '/devices/scan',
  DEVICE_DISCOVERED: '/devices/discovered',
  DEVICE_DISCOVERED_DETAIL: (id: string): string => `/devices/discovered/${id}`,
  ALERT_SEND: '/alerts/send',
  ALERT_LOGS: '/alerts/logs',
  ALERT_LOGS_FOR_DEVICE: (id: string): string => `/alerts/logs/device/${id}`,
  WS_STATUS: '/ws/status',
} as const;

// --- UI timings (presentation only) -----------------------------------------
/** How long a toast stays up before it removes itself. */
export const TOAST_DURATION_MS = 3_000;
/** Modal slide-up. */
export const MODAL_ANIMATION_MS = 300;
/** Error banner slide-down and toast slide-up. */
export const BANNER_ANIMATION_MS = 200;
/** Settings toggle knob travel. */
export const TOGGLE_ANIMATION_MS = 150;

// --- Password strength meter ------------------------------------------------
/** At or above this length a password reads "Strong"; MIN_PASSWORD_LENGTH is "Medium". */
export const STRONG_PASSWORD_LENGTH = 12;
/** Bars in the strength meter, and therefore the maximum strength score. */
export const PASSWORD_STRENGTH_LEVELS = 3;

// --- Relative time formatting -----------------------------------------------
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MS_PER_SECOND = 1_000;

// --- Platform ---------------------------------------------------------------
/**
 * Android 13 (API 33), the release that introduced POST_NOTIFICATIONS.
 *
 * Below it, notifications are granted at install time and the permission
 * string does not exist -- asking for it there is an error, not a no-op.
 */
export const ANDROID_NOTIFICATION_PERMISSION_SDK = 33;

// --- App metadata -----------------------------------------------------------
/** Shown on the settings "Version" row. Keep in step with package.json. */
export const APP_VERSION = '1.0.0';

// --- Legal ------------------------------------------------------------------
/**
 * The values the privacy policy states, kept out of the prose.
 *
 * These are duplicated in `web/src/utils/constants.ts` as `LEGAL`, for the
 * same reason the palette is duplicated: a React Native bundle and a Vite
 * bundle cannot share a module. The two policies must say the same thing, so
 * an edit here is an edit there. There is no postal address here because
 * there is not one to state yet.
 */
export const LEGAL = {
  /** ISO. Rendered spelled out, so no reader has to guess 04/09. */
  LAST_UPDATED: '2026-09-04',
  PRIVACY_EMAIL: 'privacy@beepmydevice.com',
  /** Days an alert row is kept before it is expected to be purged. */
  ACTIVITY_RETENTION_DAYS: 90,
  /** Below this age the service is not offered. */
  MINIMUM_AGE: 13,
} as const;

// --- Alert playback ---------------------------------------------------------
/**
 * Bundled sound played when this device is alerted.
 *
 * WAV, not MP3: Android resolves it from res/raw, which decodes WAV with no
 * codec involved, and the file is short enough that the size difference does
 * not matter.
 */
export const ALERT_SOUND_FILE = 'alert.wav';
/** One buzz of the alert vibration. */
const VIBRATION_BUZZ_MS = 800;
/** Gap between buzzes. */
const VIBRATION_GAP_MS = 400;
/**
 * Vibration pattern in milliseconds: wait, buzz, wait, buzz…
 *
 * Three buzzes rather than one: long enough to be findable from another room.
 */
export const ALERT_VIBRATION_PATTERN = [
  0,
  VIBRATION_BUZZ_MS,
  VIBRATION_GAP_MS,
  VIBRATION_BUZZ_MS,
  VIBRATION_GAP_MS,
  VIBRATION_BUZZ_MS,
];

// --- WiFi discovery ---------------------------------------------------------
/**
 * How long to wait for one address to answer during a subnet sweep.
 *
 * Short on purpose. A device on the same LAN answers in single-digit
 * milliseconds or not at all, so a longer wait buys nothing and multiplies the
 * whole scan: 254 addresses at one second each is over four minutes.
 */
export const SWEEP_TIMEOUT_MS = 900;

/**
 * How many addresses to probe at once.
 *
 * The sweep is bounded rather than fired all at once: 254 simultaneous sockets
 * is enough to have the OS start refusing them, and a phone on WiFi does not
 * get faster for trying. At this width a /24 finishes in roughly eight seconds.
 */
export const SWEEP_CONCURRENCY = 24;

/** Last address probed in a /24. `.0` is the network and `.255` the broadcast. */
export const SWEEP_LAST_HOST = 254;

/** How long to listen for mDNS announcements before giving up on stragglers. */
export const MDNS_TIMEOUT_MS = 5_000;

/**
 * Bonjour service types worth asking about.
 *
 * mDNS is a question, not a broadcast: nothing answers a service type nobody
 * advertises. These are the ones a home network actually carries -- printers,
 * TVs, speakers, casting targets -- which is also the honest boundary of what
 * this scan can find. A phone advertises none of them.
 */
export const MDNS_SERVICE_TYPES: readonly string[] = [
  'http',
  'ipp',
  'printer',
  'googlecast',
  'airplay',
  'raop',
  'spotify-connect',
  'workstation',
];
