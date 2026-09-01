/**
 * Environment, read once and defaulted.
 *
 * Every `import.meta.env` read in the app goes through here. Two reasons:
 *
 * A missing variable must never break the build or the boot. Vite inlines
 * these at build time, so an absent one is literally `undefined` in the
 * bundle — and `undefined` as an axios `baseURL` silently becomes the page's
 * own origin, which produces 404s against the dashboard's own HTML rather than
 * an error anyone can read. Every value here has a working default, so a
 * dashboard with no `.env` at all still runs against a same-origin API.
 *
 * And what was actually resolved is logged once at boot. "It is pointing at
 * the wrong API" is the single most common deployment mistake, and it is
 * invisible unless something says out loud where it decided to point.
 */

import {getLogger} from '@/utils/logger';

const logger = getLogger('env');

/**
 * Read one variable, falling back when it is absent or blank.
 *
 * Blank counts as absent: `VITE_API_BASE_URL=` in a .env file yields an empty
 * string, which is not a usable URL and would otherwise pass a null check.
 */
function read(name: keyof ImportMetaEnv, fallback: string): string {
  const value = import.meta.env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  return value.trim();
}

/**
 * Defaults.
 *
 * Same-origin paths, which work in development (Vite proxies them) and in
 * production (nginx proxies them). An absolute URL is only needed when the API
 * genuinely lives on another host.
 */
const DEFAULTS = {
  apiBaseUrl: '/api/v1',
  wsPath: '/ws/status',
} as const;

export const env = {
  /** Base URL for every REST call. */
  apiBaseUrl: read('VITE_API_BASE_URL', DEFAULTS.apiBaseUrl),
  /** Path or absolute URL for the status WebSocket. */
  wsPath: read('VITE_WS_URL', DEFAULTS.wsPath),

  /**
   * Firebase web app registration.
   *
   * Present so a browser build can be pointed at the same Firebase project as
   * the mobile apps. It is inert in Phase 1 — see `config/firebase.ts` for
   * what web push would still need — so every field defaults to empty and
   * nothing here is required for the dashboard to run.
   *
   * These are public identifiers, not secrets: a Firebase web `apiKey`
   * identifies the project to Google and is restricted by domain allow-list,
   * not by being hidden. They are still kept in `.env` rather than committed,
   * because which project a build talks to is deployment configuration.
   */
  firebase: {
    apiKey: read('VITE_FIREBASE_API_KEY', ''),
    authDomain: read('VITE_FIREBASE_AUTH_DOMAIN', ''),
    projectId: read('VITE_FIREBASE_PROJECT_ID', ''),
    storageBucket: read('VITE_FIREBASE_STORAGE_BUCKET', ''),
    messagingSenderId: read('VITE_FIREBASE_MESSAGING_SENDER_ID', ''),
    appId: read('VITE_FIREBASE_APP_ID', ''),
    /**
     * The Web Push certificate key pair from Firebase → Cloud Messaging.
     * Without it `getToken()` cannot mint a browser push token at all.
     */
    vapidKey: read('VITE_FIREBASE_VAPID_KEY', ''),
  },
} as const;

/** True when enough Firebase configuration is present to initialise the SDK. */
export const firebaseConfigured: boolean =
  env.firebase.apiKey !== '' && env.firebase.projectId !== '' && env.firebase.appId !== '';

/** True when a browser push token could actually be minted. */
export const webPushConfigured: boolean = firebaseConfigured && env.firebase.vapidKey !== '';

/**
 * Say once, at boot, what this build resolved to.
 *
 * Defaulted values are called out as defaults, so "no .env was deployed" reads
 * differently from "the .env points somewhere unexpected".
 */
export function logEnvironment(): void {
  logger.info('Environment resolved', {
    apiBaseUrl: env.apiBaseUrl,
    usingDefaultApi: env.apiBaseUrl === DEFAULTS.apiBaseUrl,
    wsPath: env.wsPath,
    usingDefaultWs: env.wsPath === DEFAULTS.wsPath,
    firebase: firebaseConfigured ? env.firebase.projectId : 'not configured',
    webPush: webPushConfigured ? 'configured' : 'not configured',
  });
}
