/** Small pure helpers shared across screens and components. */

import {colors} from '@styles/theme';
import type {Device, DeviceStatus, DeviceType} from '@/types/device';

import {
  BATTERY_LOW_THRESHOLD,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
} from './constants';

/** Foreground, background and border for one status. */
export interface StatusPalette {
  text: string;
  background: string;
  border: string;
}

const MAC_GROUP_SIZE = 2;
const MAC_LENGTH = 12;

/**
 * Format an ISO-8601 timestamp as a relative string, e.g. "2 min ago".
 *
 * The abbreviated forms are the ones the design canvas renders -- a device
 * card has room for "2 min ago" but not "2 minutes ago".
 */
export function formatRelativeTime(isoTimestamp: string | null): string {
  if (isoTimestamp === null) {
    return 'Never';
  }

  const then = Date.parse(isoTimestamp);
  if (Number.isNaN(then)) {
    return 'Unknown';
  }

  const seconds = Math.floor((Date.now() - then) / MS_PER_SECOND);
  if (seconds < SECONDS_PER_MINUTE) {
    return 'Just now';
  }

  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(hours / HOURS_PER_DAY);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/** Format an ISO-8601 timestamp as an absolute date, e.g. "Aug 30, 2026". */
export function formatDate(isoTimestamp: string | null): string {
  if (isoTimestamp === null) {
    return 'Unknown';
  }
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Return the icon name for a platform. Names are from the Feather set. */
export function getDeviceIcon(deviceType: DeviceType): string {
  switch (deviceType) {
    case 'ios':
    case 'android':
      return 'smartphone';
    case 'macos':
    case 'windows':
      return 'monitor';
  }
}

/** Return the human label for a platform, e.g. "Android Phone". */
export function getDeviceTypeLabel(deviceType: DeviceType): string {
  switch (deviceType) {
    case 'ios':
      return 'iOS Phone';
    case 'android':
      return 'Android Phone';
    case 'macos':
      return 'Mac Computer';
    case 'windows':
      return 'Windows PC';
  }
}

/** Return the palette colour for a status. */
export function getStatusColor(status: DeviceStatus): string {
  return getStatusPalette(status).text;
}

/**
 * Return the full foreground/background/border triple for a status.
 *
 * Callers never assemble one themselves, so a badge on the dashboard and the
 * same badge on the detail screen cannot drift apart.
 */
export function getStatusPalette(status: DeviceStatus): StatusPalette {
  switch (status) {
    case 'ONLINE':
      return {
        text: colors.statusOnlineText,
        background: colors.statusOnlineBackground,
        border: colors.statusOnlineBorder,
      };
    case 'OFFLINE':
      return {
        text: colors.statusOfflineText,
        background: colors.statusOfflineBackground,
        border: colors.statusOfflineBorder,
      };
    case 'UNKNOWN':
      return {
        text: colors.statusUnknownText,
        background: colors.statusUnknownBackground,
        border: colors.statusUnknownBorder,
      };
  }
}

/**
 * Return the palette colour for a battery level.
 *
 * Null (desktops with no battery) uses the neutral secondary text colour.
 */
export function getBatteryColor(batteryLevel: number | null): string {
  if (batteryLevel === null) {
    return colors.textSecondary;
  }
  return batteryLevel <= BATTERY_LOW_THRESHOLD
    ? colors.batteryLow
    : colors.batteryNormal;
}

/**
 * Whether a device can currently be alerted.
 *
 * Only ONLINE qualifies: OFFLINE devices cannot receive the push, and UNKNOWN
 * devices have moved off the network and are outside the alert group.
 *
 * Guest status is deliberately not consulted here -- a guest receives alerts
 * exactly like any other device. What a guest cannot do is *send* them.
 */
export function canReceiveAlert(status: DeviceStatus): boolean {
  return status === 'ONLINE';
}

/**
 * Whether the alert button should be enabled for this device.
 *
 * Reachability only. A guest is a perfectly valid *target* — finding a
 * visitor's phone on your network is what guest registration exists for, and
 * `AlertService` deliberately does not require targets to be owned by the
 * sender.
 *
 * The rule this used to enforce is a different one, about the *sender*: a
 * guest cannot send, because it holds a device token rather than a user token
 * and `get_sending_user_id` rejects it with ALERT_005. That is enforced on the
 * server against the caller's credential; it says nothing about who may be
 * beeped, and applying it here disabled the admin's button over every guest on
 * the network.
 */
export function canSendAlertTo(device: Device): boolean {
  return canReceiveAlert(device.status);
}

/** Normalise a MAC to uppercase colon-separated form, matching the backend. */
export function normalizeMacAddress(macAddress: string): string {
  const hex = macAddress.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hex.length !== MAC_LENGTH) {
    return macAddress.trim().toUpperCase();
  }
  return (hex.match(new RegExp(`.{${MAC_GROUP_SIZE}}`, 'g')) ?? []).join(':');
}
