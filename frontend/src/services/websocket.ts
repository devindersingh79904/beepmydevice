/**
 * WebSocket client for live device status.
 *
 * Reconnects with exponential backoff, because a phone changing networks or
 * waking from sleep drops the socket routinely -- that is normal operation,
 * not an error worth showing the user.
 */

import type {DeviceStatusUpdate} from '@/types/device';

/**
 * Open the status socket.
 *
 * The JWT is sent as the first frame after the handshake, since the WebSocket
 * API cannot attach an Authorization header.
 */
export function connect(_token: string): void {
  throw new Error('Not implemented');
}

/** Close the socket and cancel any pending reconnect. */
export function disconnect(): void {
  throw new Error('Not implemented');
}

/** Subscribe to status frames. Returns an unsubscribe function. */
export function onStatusUpdate(
  _callback: (update: DeviceStatusUpdate) => void,
): () => void {
  throw new Error('Not implemented');
}

/** Subscribe to connection-state changes, for the dashboard indicator. */
export function onConnectionChange(
  _callback: (connected: boolean) => void,
): () => void {
  throw new Error('Not implemented');
}
