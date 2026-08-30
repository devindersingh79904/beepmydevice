/** Small pure helpers shared across screens and components. */

import type {DeviceStatus, DeviceType} from '@types/device';

/** Format an ISO-8601 timestamp as a relative string, e.g. "2 minutes ago". */
export function formatRelativeTime(isoTimestamp: string | null): string {
  throw new Error('Not implemented');
}

/** Return the icon name for a platform. */
export function getDeviceIcon(deviceType: DeviceType): string {
  throw new Error('Not implemented');
}

/** Return the palette colour for a status. */
export function getStatusColor(status: DeviceStatus): string {
  throw new Error('Not implemented');
}

/**
 * Return the palette colour for a battery level.
 *
 * Null (desktops with no battery) uses the neutral secondary text colour.
 */
export function getBatteryColor(batteryLevel: number | null): string {
  throw new Error('Not implemented');
}

/**
 * Whether a device can currently be alerted.
 *
 * Only ONLINE qualifies: OFFLINE devices cannot receive the push, and UNKNOWN
 * devices have moved off the network and are outside the alert group.
 */
export function canReceiveAlert(status: DeviceStatus): boolean {
  throw new Error('Not implemented');
}

/** Normalise a MAC to uppercase colon-separated form, matching the backend. */
export function normalizeMacAddress(macAddress: string): string {
  throw new Error('Not implemented');
}
