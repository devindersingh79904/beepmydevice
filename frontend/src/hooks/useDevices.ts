/** Device list state, kept live by the status WebSocket. */

import type {Device} from '@types/device';

export interface UseDevicesResult {
  devices: Device[];
  /**
   * SSID of the WiFi the phone is on, for the dashboard header.
   *
   * Null while it is being resolved, or when location permission is denied --
   * the BSSID is location data on both platforms, so the app cannot name the
   * network until that is granted.
   */
  networkName: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  /** Unregister a device the signed-in user owns. */
  removeDevice: (deviceId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

/**
 * Return the device list for the current network.
 *
 * Fetches once, then applies WebSocket updates in place, so status and battery
 * change without a refetch.
 */
export function useDevices(): UseDevicesResult {
  throw new Error('Not implemented');
}
