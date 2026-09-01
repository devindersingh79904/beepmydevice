/**
 * Domain objects as the API returns them.
 *
 * Field names are the backend's, unchanged. Renaming `device_id` to `deviceId`
 * on the way in buys nothing and costs a translation layer that has to be kept
 * correct in both directions; the wire shape is the contract, so it is what
 * the app holds.
 *
 * Mirrors `backend/src/schemas/`.
 */

/** Platform a registered device runs on. Matches `DeviceType` in the backend. */
export type DeviceType = 'ios' | 'android' | 'windows' | 'macos';

/**
 * Reachability of a device.
 *
 * `UNKNOWN` is not "we are not sure" — it is set when a heartbeat arrives from
 * a WiFi network other than the one the device registered on. The device is
 * reachable but is no longer part of this alert group, and must not be
 * alertable.
 */
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

/** Delivery state of an alert. Matches `AlertStatus` in the backend. */
export type AlertStatus = 'SENT' | 'RECEIVED' | 'FAILED';

/**
 * Public view of a device. Never includes the push token.
 *
 * `status` is derived by the server on every read from `last_heartbeat`, so a
 * device that simply stopped speaking reports OFFLINE rather than staying
 * ONLINE forever. Do not re-derive it here — one place owns that rule.
 */
export interface Device {
  device_id: string;
  device_name: string | null;
  device_type: DeviceType;
  device_os_version: string | null;
  battery_level: number | null;
  status: DeviceStatus;
  last_heartbeat: string | null;
  created_at: string;
  /**
   * Derived server-side from `user_id IS NULL`, never stored. A guest
   * auto-registered with no account: it receives alerts and shows in this
   * list, and can do nothing else.
   */
  is_guest: boolean;
}

/** One row from the alert history. */
export interface AlertLog {
  alert_id: string;
  /** Device IDs, as text. The API does not expand these to names. */
  target_devices: string[];
  status: AlertStatus;
  created_at: string;
}

/** Per-device outcome of one alert, returned by POST /alerts/send. */
export interface AlertDeliveryStatus {
  device_id: string;
  device_name: string | null;
  status: AlertStatus;
  error_code: string | null;
}

/** Result of POST /alerts/send. */
export interface SendAlertResult {
  alert_id: string;
  delivery_status: AlertDeliveryStatus[];
}

/** Credentials issued by register and login. */
export interface AuthToken {
  user_id: string;
  token: string;
  token_type: string;
  expires_at: string;
}

/**
 * Notification settings.
 *
 * Every field is optional on the way in, so a client can send just the toggle
 * the user flipped; omitted fields keep their stored value. They are also the
 * only home for the canvas's Sound and Vibration switches — `POST /alerts/send`
 * accepts `device_ids` and nothing else, and the server consults these
 * preferences before it pushes.
 */
export interface NotificationPreferences {
  notifications_enabled: boolean | null;
  sound_enabled: boolean | null;
  vibration_enabled: boolean | null;
}

/**
 * A frame from the status WebSocket.
 *
 * Applied to the device already in memory rather than triggering a refetch —
 * with every device heartbeating every 30 seconds, refetching the list per
 * frame would be a request storm for a two-field change.
 */
export interface DeviceStatusFrame {
  device_id: string;
  status: DeviceStatus;
  battery_level: number | null;
  timestamp: string;
}

/**
 * The signed-in account, as far as the dashboard can know it.
 *
 * There is no profile endpoint: `POST /auth/login` returns `user_id`, `token`
 * and `expires_at`, and nothing else. The email is therefore the one the user
 * typed at sign-in, cached locally so the sidebar can address them — it is not
 * server-confirmed, and nothing is authorized from it.
 */
export interface Session {
  user_id: string;
  email: string;
  expires_at: string;
}
