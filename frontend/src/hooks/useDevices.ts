/** Device list state, kept live by the status WebSocket. */

import type {Device} from '@types/device';

export interface UseDevicesResult {
  devices: Device[];
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
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
