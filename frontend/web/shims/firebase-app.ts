/**
 * `@react-native-firebase/app` on the web.
 *
 * The native library initialises itself from `google-services.json` and
 * `GoogleService-Info.plist`, neither of which exists in a browser. Nothing in
 * this build calls Firebase — see `firebase-messaging.ts` for why — so this
 * only has to satisfy the import.
 */

const app = {
  name: '[DEFAULT]',
  options: {},
};

/** `firebase.app()` and `firebase.apps`, as the native module exposes them. */
const firebase = {
  app: () => app,
  apps: [app],
  initializeApp: () => app,
};

export default firebase;
