/** Types for devices, their status and alerts. */

/** Supported platforms. Mirrors `DeviceType` in the backend constants. */
export type DeviceType = 'ios' | 'android' | 'windows' | 'macos';

/**
 * Device reachability.
 *
 * `UNKNOWN` means the device reported a WiFi MAC other than the one it
 * registered with -- it is reachable but no longer part of this alert group,
 * so the UI must not offer to beep it.
 */
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export type AlertStatus = 'SENT' | 'RECEIVED' | 'FAILED';

export interface Device {
  device_id: string;
  device_name: string | null;
  device_type: DeviceType;
  device_os_version: string | null;
  /** Null on platforms that do not report a battery. */
  battery_level: number | null;
  status: DeviceStatus;
  last_heartbeat: string | null;
  created_at: string;
  /**
   * True for a device that auto-registered without an account.
   *
   * A guest receives alerts like any other device but cannot send them. The
   * dashboard shows a "Guest" badge and disables its alert button.
   */
  is_guest: boolean;
}

export interface DeviceRegisterRequest {
  device_name: string;
  device_type: DeviceType;
  device_os_version?: string;
  push_token: string;
  wifi_mac: string;
  network_name?: string;
  /**
   * Stable across reinstalls and push-token rotations.
   *
   * The backend matches a re-registration on this rather than on the push
   * token, which the platform reissues on every reinstall -- that is what left
   * one phone showing up in the dashboard once per install it had ever had.
   */
  install_id?: string;
}

/**
 * Result of registering.
 *
 * `device_token` is present only for a guest registration -- it authorises
 * that device's heartbeat and nothing else. An owned device gets null and uses
 * its user JWT instead.
 */
export interface DeviceRegisterResponse {
  device_id: string;
  is_guest: boolean;
  device_token: string | null;
}

export interface HeartbeatRequest {
  battery_level: number | null;
  wifi_mac: string;
}

export interface SendAlertRequest {
  /** Empty targets every device on the sender network. */
  device_ids: string[];
}

export interface AlertDeliveryStatus {
  device_id: string;
  device_name: string | null;
  status: AlertStatus;
  error_code: string | null;
}

export interface SendAlertResponse {
  alert_id: string;
  delivery_status: AlertDeliveryStatus[];
}

export interface AlertLog {
  alert_id: string;
  target_devices: string[];
  status: AlertStatus;
  created_at: string;
}

/** Frame pushed over the status WebSocket. */
export interface DeviceStatusUpdate {
  device_id: string;
  status: DeviceStatus;
  battery: number | null;
  timestamp: string;
}

/**
 * Something seen on the WiFi that is not a registered device.
 *
 * Not a `Device` and deliberately a separate type: it has no push token, no
 * status and no battery, and can never be alerted. A discovered smart TV has
 * no app on it to ring. Keeping the two apart is what stops a Send alert
 * button appearing over a printer.
 */
export interface DiscoveredDevice {
  discovered_id: string;
  ip_address: string;
  device_name: string | null;
  device_type: string | null;
  /** MDNS learned a name; SWEEP only learned that something answered. */
  discovered_via: string;
  first_seen: string;
  last_seen: string;
}

/** Body of POST /devices/scan. */
export interface ScanSubmission {
  wifi_mac: string;
  devices: {
    ip_address: string;
    device_name: string | null;
    device_type: string | null;
    discovered_via: string;
  }[];
}

/** Reply to POST /devices/scan. */
export interface ScanSubmissionResponse {
  recorded: number;
}
