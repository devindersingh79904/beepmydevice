/**
 * `react-native` on the web.
 *
 * `react-native-web` implements most of the core API, but not all of it: a few
 * exports are Android- or iOS-only concepts with nothing to map onto in a
 * browser. Importing one of those from `react-native-web` is a *build* error
 * ("X is not exported by react-native-web"), not a runtime one, so a single
 * missing name stops the whole bundle.
 *
 * Rather than editing the app to branch on `Platform.OS` at every such import
 * — which would put web concerns into files the native build has to keep
 * reading — this module re-exports everything react-native-web provides and
 * fills in the gaps. `frontend/web/vite.config.ts` aliases `react-native` here.
 *
 * Each addition below is a no-op that is *correct* for a browser, not a
 * placeholder: `PermissionsAndroid.request()` really should report "denied" on
 * a platform that has no Android permissions to grant.
 */

export * from 'react-native-web';

/**
 * Android runtime permissions.
 *
 * The app asks for `ACCESS_FINE_LOCATION` before reading the WiFi BSSID —
 * Android gates the BSSID behind location. A browser has neither the
 * permission model nor the BSSID (see `shims/network-info.ts`), so requesting
 * one is a question with no meaning here.
 *
 * "Denied" is the honest answer. Reporting "granted" would send the caller on
 * to read a BSSID it is never going to get.
 */
export const PermissionsAndroid = {
  PERMISSIONS: {
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
  },

  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },

  request: async (): Promise<string> => 'denied',
  requestMultiple: async (): Promise<Record<string, string>> => ({}),
  check: async (): Promise<boolean> => false,
};
