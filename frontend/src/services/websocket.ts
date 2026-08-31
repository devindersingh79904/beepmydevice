/**
 * WebSocket client for live device status.
 *
 * Reconnects with exponential backoff, because a phone changing networks or
 * waking from sleep drops the socket routinely -- that is normal operation,
 * not an error worth showing the user.
 */

import Config from 'react-native-config';

import type {DeviceStatusUpdate} from '@/types/device';
import {
  API_ROUTES,
  WS_MAX_RECONNECT_ATTEMPTS,
  WS_RECONNECT_BASE_DELAY_MS,
  WS_RECONNECT_MAX_DELAY_MS,
} from '@utils/constants';
import {getLogger} from '@utils/logger';

const logger = getLogger('websocket-service');

const BACKOFF_FACTOR = 2;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
/** Held so a reconnect can re-authenticate without the caller re-supplying it. */
let authToken: string | null = null;
/** True while the caller wants a connection; false after an explicit disconnect. */
let shouldConnect = false;

const statusListeners = new Set<(update: DeviceStatusUpdate) => void>();
const connectionListeners = new Set<(connected: boolean) => void>();

function notifyConnection(connected: boolean): void {
  connectionListeners.forEach(listener => listener(connected));
}

/** Delay before the next attempt, doubling each time up to the ceiling. */
function backoffDelay(): number {
  const delay = WS_RECONNECT_BASE_DELAY_MS * BACKOFF_FACTOR ** attempt;
  return Math.min(delay, WS_RECONNECT_MAX_DELAY_MS);
}

function scheduleReconnect(): void {
  if (!shouldConnect || authToken === null) {
    return;
  }
  if (attempt >= WS_MAX_RECONNECT_ATTEMPTS) {
    logger.warn(`Giving up after ${attempt} reconnect attempts`);
    return;
  }

  const delay = backoffDelay();
  attempt += 1;
  logger.info(`Reconnecting in ${delay}ms (attempt ${attempt})`);
  reconnectTimer = setTimeout(() => {
    if (authToken !== null) {
      openSocket(authToken);
    }
  }, delay);
}

function openSocket(token: string): void {
  socket = new WebSocket(`${Config.WS_BASE_URL}${API_ROUTES.WS_STATUS}`);

  socket.onopen = (): void => {
    // The handshake cannot carry an Authorization header, so the token is the
    // first frame. The server closes the socket if it does not arrive.
    socket?.send(token);
    attempt = 0;
    logger.info('Status socket open');
    notifyConnection(true);
  };

  socket.onmessage = (event: WebSocketMessageEvent): void => {
    try {
      const update = JSON.parse(String(event.data)) as DeviceStatusUpdate;
      statusListeners.forEach(listener => listener(update));
    } catch (error) {
      logger.error('Unparseable status frame', error);
    }
  };

  socket.onerror = (): void => {
    // Errors are not surfaced: the socket dropping is routine, and onclose
    // does the reconnecting.
    logger.debug('Status socket error');
  };

  socket.onclose = (): void => {
    notifyConnection(false);
    socket = null;
    scheduleReconnect();
  };
}

/**
 * Open the status socket.
 *
 * The JWT is sent as the first frame after the handshake, since the WebSocket
 * API cannot attach an Authorization header.
 */
export function connect(token: string): void {
  disconnect();
  shouldConnect = true;
  authToken = token;
  attempt = 0;
  openSocket(token);
}

/** Close the socket and cancel any pending reconnect. */
export function disconnect(): void {
  shouldConnect = false;
  authToken = null;

  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket !== null) {
    // Cleared first so the close handler does not schedule a reconnect for a
    // socket the caller deliberately closed.
    socket.onclose = null;
    socket.close();
    socket = null;
    notifyConnection(false);
  }
}

/** Subscribe to status frames. Returns an unsubscribe function. */
export function onStatusUpdate(
  callback: (update: DeviceStatusUpdate) => void,
): () => void {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
}

/** Subscribe to connection-state changes, for the dashboard indicator. */
export function onConnectionChange(
  callback: (connected: boolean) => void,
): () => void {
  connectionListeners.add(callback);
  return () => connectionListeners.delete(callback);
}
