/**
 * Every constant the dashboard uses.
 *
 * No component may write a URL string, a storage key or a bare number that
 * belongs here. Several of these exist on the backend and in the mobile app
 * too and are marked where they do — a shared constant changes in every
 * place at once or not at all.
 */

import type {AlertStatus, DeviceStatus, DeviceType} from '@/types/models';

/**
 * API paths.
 *
 * The sixteen endpoints the backend actually serves. There is deliberately no
 * `/users/me`, no profile update and no avatar upload — those screens in the
 * canvas have no endpoint behind them yet, and are rendered disabled rather
 * than pointed at a route that would 404.
 */
export const API_ROUTES = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  CHANGE_PASSWORD: '/auth/change-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  PREFERENCES: '/auth/preferences',
  DEVICE_LIST: '/devices/list',
  DEVICE_DETAIL: (id: string): string => `/devices/${id}`,
  DEVICE_DISCOVERED: '/devices/discovered',
  DEVICE_DISCOVERED_DETAIL: (id: string): string => `/devices/discovered/${id}`,
  ALERT_SEND: '/alerts/send',
  ALERT_LOGS: '/alerts/logs',
  ALERT_LOGS_FOR_DEVICE: (id: string): string => `/alerts/logs/device/${id}`,
} as const;

/** Client-side routes. */
export const ROUTES = {
  DASHBOARD: '/',
  DEVICES: '/devices',
  ACTIVITY: '/activity',
  ALERTS: '/alerts',
  SETTINGS: '/settings',
  LOGIN: '/login',
  /* Public: reachable signed out, because an app store listing has to link to
     it from outside the product. */
  PRIVACY: '/privacy',
} as const;

/**
 * The values the privacy policy states, kept out of the prose.
 *
 * A date or an address written into a paragraph is a date nobody finds again
 * when it changes, and the same two dates appear in the document head and in
 * its `<time>` elements. The third-party URLs are here for the ordinary
 * reason: no component writes a URL string.
 *
 * `ADDRESS` is deliberately absent rather than filled with a placeholder --
 * see the note in `PrivacyPage`.
 */
export const LEGAL = {
  /** ISO. Rendered through `longDate`, so the reader's locale cannot reorder
      the day and the month on a document that is dated for legal effect. */
  LAST_UPDATED: '2026-09-04',
  EFFECTIVE_FROM: '2026-09-04',
  PRIVACY_EMAIL: 'privacy@beepmydevice.com',
  WEBSITE: 'https://beepmydevice.com',
  /** The push providers' own policies, which govern what they receive. */
  GOOGLE_PRIVACY_URL: 'https://policies.google.com/privacy',
  APPLE_PRIVACY_URL: 'https://www.apple.com/privacy/',
  /** Below this age the service is not offered, and any data found is erased. */
  MINIMUM_AGE: 13,
  /** Days an alert row is kept before it is expected to be purged. */
  ACTIVITY_RETENTION_DAYS: 90,
} as const;

// The API base URL and the socket path are NOT here: they are read and
// defaulted in `@/config/env`, which logs what it resolved. Reading the
// environment from this module would close an import cycle -- the logger
// imports these constants, and the environment module imports the logger.

/** Shared with the mobile app (`frontend/src/utils/constants.ts`). */
export const API_TIMEOUT_MS = 10_000;
export const CORRELATION_ID_HEADER = 'X-Correlation-ID';
export const AUTHORIZATION_HEADER = 'Authorization';

/**
 * Shared with the backend (`OFFLINE_THRESHOLD_SECONDS`) and the mobile app
 * (`HEARTBEAT_INTERVAL_MS`). A device is expected to speak this often; the
 * server calls it offline after missing several.
 */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Pagination. `MAX_PAGE_SIZE` is enforced server-side; asking for more 422s. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const FIRST_PAGE = 1;

/** A banner that is not a form error closes itself after this long. */
export const BANNER_AUTO_DISMISS_MS = 5_000;

/**
 * Status-socket reconnection.
 *
 * Backoff doubles from the first delay up to the cap. Without a ceiling a
 * laptop that slept overnight comes back and hammers the API; without a floor
 * a server restart is met with a reconnect loop at full speed.
 */
export const WS_RECONNECT_MIN_MS = 1_000;
export const WS_RECONNECT_MAX_MS = 30_000;

/** Below this the accent calls the battery out. Matches the mobile app. */
export const BATTERY_LOW_THRESHOLD = 20;

/** Days on the activity chart. The canvas draws seven columns. */
export const ACTIVITY_WINDOW_DAYS = 7;

/**
 * How many alert rows the Activity screen aggregates over.
 *
 * The API has no statistics endpoint, so the delivery rate and the most-alerted
 * device are computed from real rows fetched here. Bounded on purpose: the
 * screen states the window it measured rather than implying it counted
 * everything.
 */
export const ACTIVITY_SAMPLE_SIZE = MAX_PAGE_SIZE;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'bmd.auth.token',
  SESSION: 'bmd.auth.session',
  CORRELATION_ID: 'bmd.correlation.id',
} as const;

/** Human labels for the platform values the API returns. */
export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  ios: 'iOS',
  android: 'Android',
  windows: 'Windows',
  macos: 'macOS',
};

/** Human labels for device status. */
export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  UNKNOWN: 'Off network',
};

/** Human labels for alert status. */
export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  SENT: 'Sent',
  RECEIVED: 'Received',
  FAILED: 'Failed',
};

/**
 * Copy for the parts of the canvas the API cannot serve yet.
 *
 * These controls are drawn and disabled rather than removed: the design is the
 * specification, and a screen that quietly drops half of it reads as finished
 * when it is not.
 */
export const NOT_YET_AVAILABLE = 'Not available yet — no endpoint for this in Phase 1.';

/* --- time ---------------------------------------------------------------- */

/**
 * Durations, built up from their units rather than written as one number.
 *
 * `86_400_000` in a file is a number nobody verifies; this way the arithmetic
 * is the documentation.
 */
export const MS_PER_SECOND = 1_000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;

export const MINUTE_MS = SECONDS_PER_MINUTE * MS_PER_SECOND;
export const HOUR_MS = MINUTES_PER_HOUR * MINUTE_MS;
export const DAY_MS = HOURS_PER_DAY * HOUR_MS;

/* --- presentation -------------------------------------------------------- */

/**
 * Icon sizes, in pixels.
 *
 * Three sizes only. A fourth would be somebody eyeballing a gap rather than
 * choosing from the scale.
 */
export const ICON_SIZE = {
  /** Inside a small button or a dense table cell. */
  small: 14,
  /** The default: inline with body text and in buttons. */
  medium: 16,
  /** Sidebar navigation and the brand tile. */
  large: 18,
  /** Stat tiles. */
  xlarge: 20,
} as const;

/** The brand mark on the sign-in card, which is larger than any icon. */
export const AUTH_MARK_SIZE = 32;

/** Default rows in a loading-state table. */
export const SKELETON_ROWS = 4;

/**
 * Characters of a UUID shown when an ID has to appear in the UI.
 *
 * Enough to tell two rows apart and to quote in a support conversation,
 * without putting a 36-character string in a table cell.
 */
export const SHORT_ID_LENGTH = 8;

/* --- logging ------------------------------------------------------------ */

/** Severity ladder, quietest first. Matches the backend's Python levels. */
export const LOG_LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * The floor for what gets written.
 *
 * DEBUG in a dev build, INFO in production. `import.meta.env.DEV` is inlined
 * at build time, so the comparison folds away and the debug branches are
 * dropped from the bundle entirely rather than shipped and skipped.
 */
export const MIN_LOG_LEVEL: LogLevel = import.meta.env.DEV ? 'DEBUG' : 'INFO';

/**
 * Context keys whose values are never printed.
 *
 * Matched as substrings against a lowercased key, so `authToken`,
 * `access_token` and `Authorization` are all caught by `token`/`auth`. A
 * browser console ends up in bug reports and screen shares; a JWT that reaches
 * it has left the machine.
 */
export const LOG_REDACTED_KEYS = [
  'token',
  'password',
  'secret',
  'authorization',
  'apikey',
  'api_key',
] as const;
