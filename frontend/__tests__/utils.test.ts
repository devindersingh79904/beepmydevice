/** Tests for the pure helpers and the storage wrapper. */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {colors} from '../src/styles/theme';
import type {Device} from '../src/types/device';
import {
  BATTERY_LOW_THRESHOLD,
  MS_PER_SECOND,
  STORAGE_KEYS,
} from '../src/utils/constants';
import {
  canReceiveAlert,
  canSendAlertTo,
  formatDate,
  formatRelativeTime,
  getBatteryColor,
  getDeviceIcon,
  getDeviceTypeLabel,
  getStatusColor,
  getStatusPalette,
  normalizeMacAddress,
} from '../src/utils/helpers';
import {clearAll, getItem, removeItem, setItem} from '../src/utils/storage';

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

/** An ISO timestamp `secondsAgo` in the past. */
function ago(secondsAgo: number): string {
  return new Date(Date.now() - secondsAgo * MS_PER_SECOND).toISOString();
}

function buildDevice(overrides: Partial<Device> = {}): Device {
  return {
    device_id: 'device-1',
    device_name: 'Pixel 8',
    device_type: 'android',
    device_os_version: '14',
    battery_level: 50,
    status: 'ONLINE',
    last_heartbeat: null,
    created_at: new Date().toISOString(),
    is_guest: false,
    ...overrides,
  };
}

describe('formatRelativeTime', () => {
  it('reports a device that has never checked in', () => {
    expect(formatRelativeTime(null)).toBe('Never');
  });

  it('reports an unparseable timestamp without throwing', () => {
    expect(formatRelativeTime('not-a-date')).toBe('Unknown');
  });

  it.each([
    [30, 'Just now'],
    [2 * MINUTE, '2 min ago'],
    [HOUR, '1 hour ago'],
    [3 * HOUR, '3 hours ago'],
    [DAY, '1 day ago'],
    [3 * DAY, '3 days ago'],
  ])('formats %i seconds ago as "%s"', (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds))).toBe(expected);
  });
});

describe('formatDate', () => {
  it('returns Unknown for null and for junk', () => {
    expect(formatDate(null)).toBe('Unknown');
    expect(formatDate('not-a-date')).toBe('Unknown');
  });

  it('formats a real timestamp', () => {
    expect(formatDate('2026-08-30T12:00:00Z')).toContain('2026');
  });
});

describe('device labels', () => {
  it.each([
    ['ios', 'smartphone', 'iOS Phone'],
    ['android', 'smartphone', 'Android Phone'],
    ['macos', 'monitor', 'Mac Computer'],
    ['windows', 'monitor', 'Windows PC'],
  ])('maps %s to its icon and label', (type, icon, label) => {
    expect(getDeviceIcon(type as Device['device_type'])).toBe(icon);
    expect(getDeviceTypeLabel(type as Device['device_type'])).toBe(label);
  });
});

describe('getStatusPalette', () => {
  it('gives each status its own foreground', () => {
    const online = getStatusPalette('ONLINE').text;
    const offline = getStatusPalette('OFFLINE').text;
    const unknown = getStatusPalette('UNKNOWN').text;

    expect(new Set([online, offline, unknown]).size).toBe(3);
  });

  it('getStatusColor returns the palette foreground', () => {
    expect(getStatusColor('ONLINE')).toBe(getStatusPalette('ONLINE').text);
  });
});

describe('getBatteryColor', () => {
  it('uses the neutral text colour when there is no battery', () => {
    expect(getBatteryColor(null)).toBe(colors.textSecondary);
  });

  it('calls out a low battery and leaves the rest as plain ink', () => {
    expect(getBatteryColor(BATTERY_LOW_THRESHOLD)).toBe(colors.batteryLow);
    expect(getBatteryColor(BATTERY_LOW_THRESHOLD + 1)).toBe(colors.batteryNormal);
  });
});

describe('alert eligibility', () => {
  it('only ONLINE devices can receive an alert', () => {
    expect(canReceiveAlert('ONLINE')).toBe(true);
    expect(canReceiveAlert('OFFLINE')).toBe(false);
    // UNKNOWN means the device moved off this network, so it is outside the
    // alert group even though it is reachable.
    expect(canReceiveAlert('UNKNOWN')).toBe(false);
  });

  it('a guest can receive alerts but its button is still disabled', () => {
    const guest = buildDevice({is_guest: true, status: 'ONLINE'});

    expect(canReceiveAlert(guest.status)).toBe(true);
    expect(canSendAlertTo(guest)).toBe(false);
  });

  it('an owned ONLINE device can be alerted', () => {
    expect(canSendAlertTo(buildDevice({status: 'ONLINE'}))).toBe(true);
  });
});

describe('normalizeMacAddress', () => {
  it.each([
    ['00:1a:2b:3c:4d:5e', '00:1A:2B:3C:4D:5E'],
    ['00-1a-2b-3c-4d-5e', '00:1A:2B:3C:4D:5E'],
    ['001A2B3C4D5E', '00:1A:2B:3C:4D:5E'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeMacAddress(input)).toBe(expected);
  });

  it('leaves an unrecognisable value alone rather than inventing a MAC', () => {
    expect(normalizeMacAddress('nonsense')).toBe('NONSENSE');
  });
});

describe('storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round-trips a value', async () => {
    await setItem(STORAGE_KEYS.DEVICE_ID, 'device-1');

    await expect(getItem<string>(STORAGE_KEYS.DEVICE_ID)).resolves.toBe('device-1');
  });

  it('returns null for a missing key', async () => {
    await expect(getItem(STORAGE_KEYS.USER)).resolves.toBeNull();
  });

  it('treats an unreadable value as absent instead of crashing', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, '{not valid json');

    await expect(getItem(STORAGE_KEYS.USER)).resolves.toBeNull();
  });

  it('removes one key', async () => {
    await setItem(STORAGE_KEYS.DEVICE_ID, 'device-1');

    await removeItem(STORAGE_KEYS.DEVICE_ID);

    await expect(getItem(STORAGE_KEYS.DEVICE_ID)).resolves.toBeNull();
  });

  it('clears only this app namespaced keys on logout', async () => {
    await setItem(STORAGE_KEYS.AUTH_TOKEN, 'jwt');
    await AsyncStorage.setItem('some-library-key', 'keep-me');

    await clearAll();

    await expect(getItem(STORAGE_KEYS.AUTH_TOKEN)).resolves.toBeNull();
    // AsyncStorage.clear() would have taken this too.
    await expect(AsyncStorage.getItem('some-library-key')).resolves.toBe('keep-me');
  });
});
