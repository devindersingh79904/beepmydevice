/**
 * Alerts.
 *
 * The dashboard can send an alert because `AlertService.send_alert` authorizes
 * on "the sender is this network's admin" — not on the sender being present on
 * the network. A browser on a laptop is therefore a legitimate sender, and the
 * WiFi MAC still carries the whole boundary for the *targets*.
 */

import type {AlertLog, Device, SendAlertResult} from '@/types/models';
import type {Paged} from '@/types/api';
import {
  ACTIVITY_WINDOW_DAYS,
  API_ROUTES,
  DEFAULT_PAGE_SIZE,
  FIRST_PAGE,
  SHORT_ID_LENGTH,
} from '@/utils/constants';
import {getPaged, post} from '@/utils/api-client';

/**
 * Send an alert.
 *
 * An empty `deviceIds` targets every device on the network, guests included —
 * that is the API's own convention, not a shortcut invented here.
 *
 * The body carries device IDs and nothing else. The canvas's Sound and
 * Vibration switches are not sent from here: they are the *recipient's*
 * preferences, stored per account and consulted server-side before the push
 * goes out, so they belong on `PUT /auth/preferences`. Sending them per-alert
 * would let a sender override what a device's owner chose.
 *
 * There is no partial delivery. If the targets span two networks, or the
 * sender does not administer the network, or nothing reachable is left, the
 * whole request is refused — no subset is alerted.
 */
export async function sendAlert(deviceIds: string[] = []): Promise<SendAlertResult> {
  return post<SendAlertResult>(API_ROUTES.ALERT_SEND, {device_ids: deviceIds});
}

/** The caller's alert history, newest first. */
export async function listAlerts(
  page: number = FIRST_PAGE,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<Paged<AlertLog>> {
  return getPaged<AlertLog>(API_ROUTES.ALERT_LOGS, {page, limit});
}

/** The alerts that targeted one device, newest first. */
export async function listAlertsForDevice(
  deviceId: string,
  page: number = FIRST_PAGE,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<Paged<AlertLog>> {
  return getPaged<AlertLog>(API_ROUTES.ALERT_LOGS_FOR_DEVICE(deviceId), {page, limit});
}

/**
 * Resolve the device IDs on an alert row to names.
 *
 * `alert_logs.target_devices` stores IDs as text and the API does not expand
 * them, so the join happens here against the device list already in memory. A
 * target that has since been removed keeps its ID rather than vanishing from
 * the row — the audit record should not quietly lose an entry.
 */
export function targetNames(alert: AlertLog, devices: Device[]): string[] {
  const byId = new Map(devices.map(device => [device.device_id, device]));
  return alert.target_devices.map(id => {
    const device = byId.get(id);
    const name = device?.device_name?.trim();
    return name !== undefined && name !== ''
      ? name
      : `Removed device (${id.slice(0, SHORT_ID_LENGTH)})`;
  });
}

/** How the canvas labels an alert's breadth. */
export function targetKind(alert: AlertLog): 'Single' | 'Multiple' | 'All' {
  return alert.target_devices.length === 1 ? 'Single' : 'Multiple';
}

/** One column of the activity chart. */
export interface ActivityDay {
  /** Midnight local time for this day. */
  date: Date;
  /** Single-letter weekday, as the canvas labels the axis. */
  label: string;
  count: number;
}

/**
 * Bucket alerts into the last N days, oldest column first.
 *
 * Days with no alerts are kept as zero-height columns: a chart that omits them
 * would compress the axis and make a quiet week look like a busy one.
 */
export function bucketByDay(
  alerts: AlertLog[],
  days: number = ACTIVITY_WINDOW_DAYS,
  now: number = Date.now(),
): ActivityDay[] {
  const buckets: ActivityDay[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    buckets.push({
      date,
      label: date.toLocaleDateString(undefined, {weekday: 'narrow'}),
      count: 0,
    });
  }

  const earliest = buckets[0]?.date.getTime() ?? now;

  for (const alert of alerts) {
    const at = Date.parse(alert.created_at);
    if (Number.isNaN(at) || at < earliest) {
      continue;
    }
    const day = new Date(at);
    day.setHours(0, 0, 0, 0);
    const index = buckets.findIndex(bucket => bucket.date.getTime() === day.getTime());
    if (index >= 0) {
      const bucket = buckets[index];
      if (bucket) {
        bucket.count += 1;
      }
    }
  }

  return buckets;
}

/** Alerts raised since local midnight. */
export function sentToday(alerts: AlertLog[], now: number = Date.now()): number {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return alerts.filter(alert => Date.parse(alert.created_at) >= midnight.getTime()).length;
}

/**
 * The share of alerts that were not FAILED, as a percentage.
 *
 * Measured over whatever rows were fetched, not over all history — the API has
 * no statistics endpoint, so the screen states the window it measured rather
 * than implying it counted everything. Returns null for an empty sample: "0%"
 * would read as total failure.
 */
export function deliveryRate(alerts: AlertLog[]): number | null {
  if (alerts.length === 0) {
    return null;
  }
  const delivered = alerts.filter(alert => alert.status !== 'FAILED').length;
  return Math.round((delivered / alerts.length) * 100);
}

/** The device targeted most often in this sample, with its count. */
export function mostAlerted(
  alerts: AlertLog[],
  devices: Device[],
): {name: string; count: number} | null {
  const tally = new Map<string, number>();
  for (const alert of alerts) {
    for (const id of alert.target_devices) {
      tally.set(id, (tally.get(id) ?? 0) + 1);
    }
  }

  let bestId: string | null = null;
  let bestCount = 0;
  for (const [id, n] of tally) {
    if (n > bestCount) {
      bestId = id;
      bestCount = n;
    }
  }

  if (bestId === null) {
    return null;
  }

  const device = devices.find(candidate => candidate.device_id === bestId);
  const name = device?.device_name?.trim();
  return {
    name:
      name !== undefined && name !== ''
        ? name
        : `Removed device (${bestId.slice(0, SHORT_ID_LENGTH)})`,
    count: bestCount,
  };
}
