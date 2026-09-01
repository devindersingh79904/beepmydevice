/**
 * `@react-native-firebase/messaging` on the web.
 *
 * The native library is a wrapper around the Firebase Android and iOS SDKs and
 * has no browser build at all. Browser push exists — it is a different product
 * (`firebase/messaging` with a service worker and a VAPID key) with a
 * different API — but wiring it up would not make this build alertable, for a
 * reason that has nothing to do with Firebase:
 *
 *   A push has to be addressed to a device in a WiFi alert group, and a
 *   browser cannot read a BSSID, so it cannot be in one. See
 *   `shims/network-info.ts`.
 *
 * `getToken()` therefore returns an empty string. `useDeviceRegistration`
 * treats an empty push token the same way it treats a missing BSSID: it does
 * not register. That is the correct outcome — a device row holding a push
 * token nothing can deliver to would show as a real, alertable device in every
 * admin's list and silently fail every time.
 *
 * The subscription functions return working no-op unsubscribes rather than
 * `undefined`, so the effects that call them still clean up correctly.
 */

import {getLogger} from '../../src/utils/logger';

const logger = getLogger('firebase-messaging.web');

/** Authorization statuses, matching the native enum the app compares against. */
export const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
} as const;

type Unsubscribe = () => void;

const noop: Unsubscribe = () => undefined;

const messagingInstance = {
  /**
   * Empty string, not a fake token.
   *
   * The caller checks for a usable token; an invented one would register a
   * device that can never be reached.
   */
  getToken: async (): Promise<string> => {
    logger.warn('Push is not available in a browser build; no token minted');
    return '';
  },

  /** Denied: there is nothing to grant. */
  requestPermission: async (): Promise<number> => AuthorizationStatus.DENIED,

  /** No token exists, so it can never refresh. */
  onTokenRefresh: (): Unsubscribe => noop,

  /** No messages arrive. */
  onMessage: (): Unsubscribe => noop,

  /** No background context exists in a tab. */
  setBackgroundMessageHandler: (): void => undefined,
};

/** `messaging()` — the callable default export the native library provides. */
function messaging(): typeof messagingInstance {
  return messagingInstance;
}

messaging.AuthorizationStatus = AuthorizationStatus;

export default messaging;
