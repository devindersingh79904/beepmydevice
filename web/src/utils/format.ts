/**
 * Presentation helpers.
 *
 * Formatting only — nothing here decides whether a device is reachable or
 * whether an alert may be sent. Those are the server's calls, and duplicating
 * them in a formatter is how two answers to one question get shipped.
 */

import {BATTERY_LOW_THRESHOLD, DAY_MS, DEVICE_TYPE_LABEL, HOUR_MS, MINUTE_MS} from './constants';
import type {Device, DeviceType} from '@/types/models';

/**
 * "2 min ago", as the canvas writes it.
 *
 * Returns "Never" for a device that has not yet reported — distinct from
 * "a long time ago", and the difference matters when diagnosing a device that
 * registered but never started its heartbeat.
 */
export function relativeTime(iso: string | null, now: number = Date.now()): string {
  if (iso === null) {
    return 'Never';
  }

  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return 'Unknown';
  }

  const elapsed = now - then;

  // A clock skew between the browser and the server can put a timestamp
  // slightly in the future. "Just now" is truer than "in -3 minutes".
  if (elapsed < MINUTE_MS) {
    return 'Just now';
  }
  if (elapsed < HOUR_MS) {
    const minutes = Math.floor(elapsed / MINUTE_MS);
    return `${minutes} min ago`;
  }
  if (elapsed < DAY_MS) {
    const hours = Math.floor(elapsed / HOUR_MS);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(elapsed / DAY_MS);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

/** "Today 2:45 PM" / "Yesterday 9:15 AM" / "31 Aug 2026, 9:15 AM". */
export function timestamp(iso: string, now: number = Date.now()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return 'Unknown';
  }

  const time = then.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'});
  const today = new Date(now);

  if (isSameDay(then, today)) {
    return `Today ${time}`;
  }

  const yesterday = new Date(now - DAY_MS);
  if (isSameDay(then, yesterday)) {
    return `Yesterday ${time}`;
  }

  const date = then.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${date}, ${time}`;
}

/** Calendar-day equality in the viewer's own timezone. */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "31 Aug 2026". */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

/**
 * "31 August 2026" — the month spelled out, and always in that order.
 *
 * `shortDate` follows the reader's locale, which is right for a table of
 * heartbeats and wrong for a document dated for legal effect: 04/09/2026 is
 * two different days on two sides of an ocean. The locale is pinned here and
 * the month is a word, so the date cannot be misread.
 */
export function longDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});
}

/** The device's platform, spelled the way people write it. */
export function deviceTypeLabel(type: DeviceType): string {
  return DEVICE_TYPE_LABEL[type] ?? type;
}

/**
 * The name to show for a device.
 *
 * `device_name` is nullable in the schema, and a guest that registered without
 * one would otherwise render as an empty cell.
 */
export function deviceLabel(device: Device): string {
  const name = device.device_name?.trim();
  return name !== undefined && name !== '' ? name : 'Unnamed device';
}

/** True when the battery should be called out in the accent. */
export function isBatteryLow(level: number | null): boolean {
  return level !== null && level <= BATTERY_LOW_THRESHOLD;
}

/** "85%", or an em dash for a device that has never reported one. */
export function batteryLabel(level: number | null): string {
  return level === null ? '—' : `${level}%`;
}

/** Initials for the sidebar avatar. */
export function initials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || '?';
}

/** Pluralise a countable noun: `count(1, 'device')` is "1 device". */
export function count(n: number, noun: string, plural?: string): string {
  return n === 1 ? `1 ${noun}` : `${n} ${plural ?? `${noun}s`}`;
}
