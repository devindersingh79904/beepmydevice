/**
 * Firebase for the web dashboard.
 *
 * Configured, and deliberately inert in Phase 1. That is worth being explicit
 * about, because "the config is there so push must work" is exactly the wrong
 * conclusion to draw from finding these values in `.env`.
 *
 * What the config is for: it points a browser build at the same Firebase
 * project as the Android and iOS apps (`beepmydevice-…`), so when web push is
 * wired up it is talking to the same project the backend already sends from.
 *
 * What still has to exist before a browser could be alerted:
 *
 *   1. **A VAPID key.** Firebase → Project settings → Cloud Messaging → Web
 *      Push certificates → Generate key pair. Without it `getToken()` cannot
 *      mint a token, and there is nothing for the backend to push to.
 *   2. **A service worker** at `/firebase-messaging-sw.js`. Browser push is
 *      delivered to a worker, not to the page — a tab that is closed receives
 *      nothing, and the dashboard is not usually the open tab when someone is
 *      looking for their phone.
 *   3. **A device registration.** The backend identifies an alert group by
 *      WiFi BSSID. A browser cannot read one — there is no web API for it at
 *      any permission level — so a browser cannot join a network's alert
 *      group. This is not a missing endpoint; it is the platform.
 *
 * Point (3) is why this stays inert rather than half-built. The dashboard's
 * job is to *send* alerts, which it does through the REST API and which needs
 * no Firebase at all. Receiving them is what the phone is for.
 *
 * The Firebase SDK is intentionally not a dependency of this package. Adding
 * ~150 KB of it to every page load to hold configuration nothing calls would
 * be worse than the two lines it saves later.
 */

import {env, firebaseConfigured, webPushConfigured} from '@/config/env';
import {getLogger} from '@/utils/logger';

const logger = getLogger('firebase');

/**
 * The `firebaseConfig` object the Web SDK expects.
 *
 * Shaped exactly as `initializeApp()` takes it, so wiring it up later is one
 * import and one call rather than a translation.
 */
export const firebaseConfig = {
  apiKey: env.firebase.apiKey,
  authDomain: env.firebase.authDomain,
  projectId: env.firebase.projectId,
  storageBucket: env.firebase.storageBucket,
  messagingSenderId: env.firebase.messagingSenderId,
  appId: env.firebase.appId,
} as const;

/**
 * Report what is and is not in place, once, at boot.
 *
 * A warning rather than silence: someone who has put a full Firebase config in
 * `.env` reasonably expects push to work, and should be told in one line why
 * it does not, rather than discovering it by waiting for an alert that never
 * arrives.
 */
export function reportFirebaseStatus(): void {
  if (!firebaseConfigured) {
    logger.debug('Firebase is not configured for this build; the dashboard does not need it');
    return;
  }

  if (!webPushConfigured) {
    logger.warn(
      'Firebase is configured but web push is not: no VAPID key (VITE_FIREBASE_VAPID_KEY). ' +
        'The dashboard sends alerts through the REST API and does not need it.',
      {project: env.firebase.projectId},
    );
    return;
  }

  logger.info(
    'Firebase and a VAPID key are present, but web push is not implemented in Phase 1: ' +
      'a browser cannot read a WiFi BSSID, so it cannot join a network alert group.',
    {project: env.firebase.projectId},
  );
}
