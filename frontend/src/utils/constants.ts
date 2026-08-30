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
