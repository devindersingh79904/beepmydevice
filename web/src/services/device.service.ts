/**
 * Devices.
 *
 * The dashboard reads and removes devices; it never registers one. Registration
 * requires a WiFi BSSID and a push token, and a browser can supply neither —
 * that is the mobile app's job, and it is why the empty state here points at
 * the app rather than offering an "add device" button.
 */

import type {Device} from '@/types/models';
import type {Paged} from '@/types/api';
import {API_ROUTES, DEFAULT_PAGE_SIZE, FIRST_PAGE} from '@/utils/constants';
import {del, get, getPaged} from '@/utils/api-client';

/**
 * List every device on the caller's network, guests included.
 *
 * Network-scoped, not owner-scoped: the admin sees guests, which have no owner
 * at all. Requires a user token — a guest device holds only a device token and
 * can never enumerate the network it joined.
 */
export async function listDevices(
  page: number = FIRST_PAGE,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<Paged<Device>> {
  return getPaged<Device>(API_ROUTES.DEVICE_LIST, {page, limit});
}

/** One device's detail. */
export async function getDevice(deviceId: string): Promise<Device> {
  return get<Device>(API_ROUTES.DEVICE_DETAIL(deviceId));
}

/**
 * Unregister a device.
 *
 * The network admin may remove any device on their network, guests included —
 * that is the control that makes open guest auto-registration acceptable.
 */
export async function removeDevice(deviceId: string): Promise<void> {
  await del(API_ROUTES.DEVICE_DETAIL(deviceId));
}

/**
 * Whether this device can be sent an alert.
 *
 * Presentation only. The server runs the real check — same network, sender is
 * the admin, target reachable — and refuses the whole request if any of it
 * fails. Greying the button here is a courtesy so the user does not fire a
 * request that was always going to be rejected; it is not the control.
 *
 * OFFLINE and UNKNOWN are both excluded. UNKNOWN means the device answered
 * from a different WiFi network: reachable, but no longer part of this alert
 * group.
 */
export function isAlertable(device: Device): boolean {
  return device.status === 'ONLINE';
}
