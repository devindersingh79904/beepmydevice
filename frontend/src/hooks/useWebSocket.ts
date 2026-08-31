/** Manage the status WebSocket lifecycle for a screen. */

import {useEffect, useState} from 'react';

import type {DeviceStatusUpdate} from '@/types/device';
import * as websocketService from '@services/websocket';

export interface UseWebSocketResult {
  isConnected: boolean;
  lastUpdate: DeviceStatusUpdate | null;
}

/**
 * Connect on mount, disconnect on unmount.
 *
 * Subscribe-only: DeviceProvider owns the single socket, so a screen mounting
 * this hook observes that connection rather than opening a second one.
 *
 * @param enabled - Pass false to hold the connection closed, e.g. while signed out.
 */
export function useWebSocket(enabled: boolean): UseWebSocketResult {
  const [isConnected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<DeviceStatusUpdate | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    const unsubscribeStatus = websocketService.onStatusUpdate(setLastUpdate);
    const unsubscribeConnection =
      websocketService.onConnectionChange(setConnected);

    return () => {
      unsubscribeStatus();
      unsubscribeConnection();
    };
  }, [enabled]);

  return {isConnected, lastUpdate};
}
