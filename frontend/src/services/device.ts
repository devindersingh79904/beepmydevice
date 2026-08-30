/** Device API calls and local device introspection. */

import type {
  Device,
  DeviceRegisterRequest,
  DeviceType,
  HeartbeatRequest,
} from '@types/device';
import type {PaginationMeta, PaginationParams} from '@types/api';

/** Register this device with the backend and persist its returned ID. */
export async function registerDevice(
  payload: DeviceRegisterRequest,
): Promise<string> {
  throw new Error('Not implemented');
}

/** List the signed-in user devices on the current network. */
export async function listDevices(
  params?: PaginationParams,
): Promise<{items: Device[]; pagination: PaginationMeta}> {
  throw new Error('Not implemented');
}

/** Fetch one device. */
export async function getDevice(deviceId: string): Promise<Device> {
  throw new Error('Not implemented');
}

/** Send one heartbeat. Called on the HEARTBEAT_INTERVAL_MS timer. */
export async function sendHeartbeat(
  deviceId: string,
  payload: HeartbeatRequest,
): Promise<void> {
  throw new Error('Not implemented');
}

/** Unregister a device. */
export async function removeDevice(deviceId: string): Promise<void> {
  throw new Error('Not implemented');
}

/** Detect which platform this build is running on. */
export function detectDeviceType(): DeviceType {
  throw new Error('Not implemented');
}

/**
 * Read the current WiFi MAC (BSSID).
 *
 * Requires location permission on both iOS and Android -- the platforms treat
 * the BSSID as location data. Returns null when permission is denied, which
 * the caller must surface as a setup prompt rather than a silent failure.
 */
export async function getWifiMacAddress(): Promise<string | null> {
  throw new Error('Not implemented');
}

/** Read the battery level 0-100, or null on platforms without a battery. */
export async function getBatteryLevel(): Promise<number | null> {
  throw new Error('Not implemented');
}
