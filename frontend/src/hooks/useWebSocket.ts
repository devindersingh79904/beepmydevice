/** Manage the status WebSocket lifecycle for a screen. */

import type {DeviceStatusUpdate} from '@types/device';

export interface UseWebSocketResult {
  isConnected: boolean;
  lastUpdate: DeviceStatusUpdate | null;
}

/**
 * Connect on mount, disconnect on unmount.
 *
 * @param enabled - Pass false to hold the connection closed, e.g. while signed out.
 */
export function useWebSocket(enabled: boolean): UseWebSocketResult {
  throw new Error('Not implemented');
}
