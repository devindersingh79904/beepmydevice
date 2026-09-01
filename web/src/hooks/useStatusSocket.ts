/**
 * The status WebSocket.
 *
 * Device status changes arrive here rather than by polling. With every device
 * heartbeating every 30 seconds, a dashboard that refetched the list to notice
 * a battery change would be a request storm for a two-field update.
 *
 * The handshake is unusual and worth knowing: a WebSocket upgrade cannot carry
 * an `Authorization` header, so the server accepts the socket first and expects
 * the JWT as the *first message*. A socket that sends anything else is closed.
 */

import {useEffect, useRef, useState} from 'react';

import type {DeviceStatusFrame} from '@/types/models';
import {env} from '@/config/env';
import {STORAGE_KEYS, WS_RECONNECT_MAX_MS, WS_RECONNECT_MIN_MS} from '@/utils/constants';
import {getLogger} from '@/utils/logger';
import {getItem} from '@/utils/storage';

const logger = getLogger('status-socket');

/**
 * Absolute ws:// or wss:// URL for the status socket.
 *
 * A relative path is resolved against the page, so the scheme follows it —
 * wss on an https page, ws on http. Hard-coding ws:// would make the socket
 * mixed content on any https deployment, and the browser would block it
 * silently.
 */
function socketUrl(): string {
  if (/^wss?:\/\//.test(env.wsPath)) {
    return env.wsPath;
  }
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}${env.wsPath}`;
}

interface StatusSocket {
  /** True while the socket is open and authenticated. */
  live: boolean;
}

/**
 * Subscribe to device status frames for as long as the component is mounted.
 *
 * @param enabled - False while signed out, so no socket is opened without a token.
 * @param onFrame - Called for each frame. Kept in a ref so a caller passing an
 *   inline function does not tear the socket down and rebuild it every render.
 */
export function useStatusSocket(
  enabled: boolean,
  onFrame: (frame: DeviceStatusFrame) => void,
): StatusSocket {
  const [live, setLive] = useState(false);
  const handlerRef = useRef(onFrame);
  handlerRef.current = onFrame;

  useEffect(() => {
    if (!enabled) {
      setLive(false);
      return;
    }

    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let backoff = WS_RECONNECT_MIN_MS;
    // Guards the async callbacks: without it, a socket closing during unmount
    // schedules a reconnect that outlives the component.
    let disposed = false;

    const connect = (): void => {
      if (disposed) {
        return;
      }

      const token = getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token === null || token === '') {
        logger.warn('No token stored; not opening the status socket');
        return;
      }

      logger.debug('Opening status socket', {url: socketUrl()});
      socket = new WebSocket(socketUrl());

      socket.onopen = () => {
        // The token goes first, before anything else is sent. The server is
        // waiting on exactly this frame and closes the socket without it.
        socket?.send(token);
        if (!disposed) {
          logger.info('Status socket open');
          setLive(true);
          backoff = WS_RECONNECT_MIN_MS;
        }
      };

      socket.onmessage = event => {
        try {
          const frame = JSON.parse(String(event.data)) as DeviceStatusFrame;
          if (typeof frame.device_id === 'string') {
            handlerRef.current(frame);
          }
        } catch (error) {
          // A frame that is not the JSON we expect is dropped rather than
          // thrown: one malformed message must not kill the subscription.
          logger.warn('Discarded a malformed status frame', {error: String(error)});
        }
      };

      socket.onerror = () => {
        // `onclose` always follows, and handles the reconnect. Doing it here
        // too would open two sockets.
      };

      socket.onclose = () => {
        if (disposed) {
          return;
        }
        setLive(false);
        // Exponential backoff with a ceiling: a laptop waking from sleep must
        // not hammer the API, and a restarting server must not be met with a
        // reconnect loop running flat out.
        logger.warn('Status socket closed; reconnecting', {inMs: backoff});
        retryTimer = window.setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, WS_RECONNECT_MAX_MS);
      };
    };

    connect();

    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      // Drop the handler before closing, so the teardown does not schedule a
      // reconnect on its way out.
      if (socket !== null) {
        socket.onclose = null;
        socket.close();
      }
      setLive(false);
    };
  }, [enabled]);

  return {live};
}
