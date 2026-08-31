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
  DEVICE_REGISTER: '/devices/register',
  DEVICE_LIST: '/devices/list',
  DEVICE_DETAIL: (id: string): string => `/devices/${id}`,
  DEVICE_HEARTBEAT: (id: string): string => `/devices/${id}/heartbeat`,
  ALERT_SEND: '/alerts/send',
  ALERT_LOGS: '/alerts/logs',
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

// --- App metadata -----------------------------------------------------------
/** Shown on the settings "Version" row. Keep in step with package.json. */
export const APP_VERSION = '1.0.0';

// --- Alert playback ---------------------------------------------------------
/** Bundled sound played when this device is alerted. */
export const ALERT_SOUND_FILE = 'alert.mp3';
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
