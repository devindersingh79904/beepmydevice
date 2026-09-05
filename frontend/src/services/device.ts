/** Device API calls and local device introspection. */

import {PermissionsAndroid, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {NetworkInfo} from 'react-native-network-info';

import type {PaginationMeta, PaginationParams} from '@/types/api';
import type {
  Device,
  DeviceRegisterRequest,
  DeviceRegisterResponse,
  DeviceType,
  DiscoveredDevice,
  HeartbeatRequest,
  ScanSubmission,
  ScanSubmissionResponse,
} from '@/types/device';
import type {Observation} from './discovery';
import {API_ROUTES, STORAGE_KEYS} from '@utils/constants';
import {normalizeMacAddress} from '@utils/helpers';
import {getLogger} from '@utils/logger';
import {setItem} from '@utils/storage';

import {get, getPaginated, post, put, remove} from './api';

const logger = getLogger('device-service');

/** DeviceInfo reports battery as 0-1; the API and UI both use 0-100. */
const BATTERY_SCALE = 100;
/** DeviceInfo returns -1 when the platform has no battery to report. */
const NO_BATTERY = -1;

/** Register this device with the backend and persist its returned ID. */
export async function registerDevice(
  payload: DeviceRegisterRequest,
): Promise<string> {
  const result = await post<DeviceRegisterRequest, DeviceRegisterResponse>(
    API_ROUTES.DEVICE_REGISTER,
    payload,
  );

  await setItem(STORAGE_KEYS.DEVICE_ID, result.device_id);
  if (result.device_token !== null) {
    // A guest has no account, so this token is the only credential it will
    // ever hold. Losing it means the device can no longer heartbeat.
    await setItem(STORAGE_KEYS.AUTH_TOKEN, result.device_token);
  }
  logger.info(`Registered as ${result.is_guest ? 'guest' : 'owned'} device`);
  return result.device_id;
}

/** List the signed-in user devices on the current network. */
export async function listDevices(
  params?: PaginationParams,
): Promise<{items: Device[]; pagination: PaginationMeta}> {
  return getPaginated<Device>(API_ROUTES.DEVICE_LIST, params);
}

/** Fetch one device. */
export async function getDevice(deviceId: string): Promise<Device> {
  return get<Device>(API_ROUTES.DEVICE_DETAIL(deviceId));
}

/** Send one heartbeat. Called on the HEARTBEAT_INTERVAL_MS timer. */
export async function sendHeartbeat(
  deviceId: string,
  payload: HeartbeatRequest,
): Promise<void> {
  await put<HeartbeatRequest, Device>(
    API_ROUTES.DEVICE_HEARTBEAT(deviceId),
    payload,
  );
}

/** Unregister a device. */
export async function removeDevice(deviceId: string): Promise<void> {
  await remove(API_ROUTES.DEVICE_DETAIL(deviceId));
}

/** Detect which platform this build is running on. */
export function detectDeviceType(): DeviceType {
  switch (Platform.OS) {
    case 'ios':
      return 'ios';
    case 'android':
      return 'android';
    case 'windows':
      return 'windows';
    case 'macos':
      return 'macos';
    default:
      // React Native also reports "web"; this app has no web target, and
      // treating it as iOS would route its pushes to the wrong provider.
      throw new Error(`Unsupported platform: ${Platform.OS}`);
  }
}

/**
 * Ask for the location permission Android requires before it will report a BSSID.
 *
 * @returns True when the permission is granted.
 */
async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // iOS grants this through the Info.plist prompt raised by NetworkInfo.
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Read the current WiFi MAC (BSSID).
 *
 * Requires location permission on both iOS and Android -- the platforms treat
 * the BSSID as location data. Returns null when permission is denied, which
 * the caller must surface as a setup prompt rather than a silent failure.
 */
export async function getWifiMacAddress(): Promise<string | null> {
  if (!(await ensureLocationPermission())) {
    logger.warn('Location permission denied; cannot read the WiFi BSSID');
    return null;
  }

  try {
    const bssid = await NetworkInfo.getBSSID();
    if (bssid === null || bssid === undefined || bssid === '') {
      return null;
    }
    // Normalised here so the value matches what the backend stored, whichever
    // separator and case the platform happened to use.
    return normalizeMacAddress(bssid);
  } catch (error) {
    logger.error('Could not read the WiFi BSSID', error);
    return null;
  }
}

/**
 * Read the current WiFi network name (SSID).
 *
 * Display only -- the BSSID is what authorization is based on, because an SSID
 * is trivially spoofed by naming another router "Home-WiFi".
 */
export async function getWifiNetworkName(): Promise<string | null> {
  if (!(await ensureLocationPermission())) {
    return null;
  }
  try {
    const ssid = await NetworkInfo.getSSID();
    return ssid === null || ssid === undefined || ssid === '' ? null : ssid;
  } catch (error) {
    logger.error('Could not read the WiFi SSID', error);
    return null;
  }
}

/** Read the battery level 0-100, or null on platforms without a battery. */
export async function getBatteryLevel(): Promise<number | null> {
  try {
    const level = await DeviceInfo.getBatteryLevel();
    if (level === NO_BATTERY) {
      return null;
    }
    return Math.round(level * BATTERY_SCALE);
  } catch (error) {
    logger.error('Could not read the battery level', error);
    return null;
  }
}

/**
 * Report what a scan of this network found.
 *
 * The server cannot perform this scan -- it is a cloud relay, and a scan there
 * enumerates the datacenter -- so this call is the only way these rows ever
 * appear. It is refused unless the caller administers the network named.
 *
 * @returns How many observations the server recorded.
 */
export async function submitScan(
  wifiMac: string,
  devices: Observation[],
): Promise<number> {
  const result = await post<ScanSubmission, ScanSubmissionResponse>(
    API_ROUTES.DEVICE_SCAN,
    {wifi_mac: wifiMac, devices},
  );
  return result.recorded;
}

/** List what has been seen on this network but has no app installed. */
export async function listDiscovered(): Promise<DiscoveredDevice[]> {
  return get<DiscoveredDevice[]>(API_ROUTES.DEVICE_DISCOVERED);
}

/** Drop one observation. It returns if a later scan sees it again. */
export async function ignoreDiscovered(discoveredId: string): Promise<void> {
  await remove(API_ROUTES.DEVICE_DISCOVERED_DETAIL(discoveredId));
}
