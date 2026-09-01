/**
 * `react-native-config` on the web.
 *
 * The native library reads `.env` at *build* time and exposes it through a
 * generated native class. There is no native class in a browser, so the same
 * values are read from Vite's `import.meta.env` instead.
 *
 * The names differ by prefix — Vite only exposes variables beginning `VITE_`
 * to client code — so `API_BASE_URL` here comes from `VITE_API_BASE_URL`.
 *
 * Every value has a working default. A missing `.env` must never be the reason
 * the app fails to boot: it falls back to same-origin paths, which the dev
 * server proxies to the API.
 */

/** Read one variable, treating blank as absent. */
function read(name: string, fallback: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  return value.trim();
}

/**
 * The same shape `react-native-config` exports, so no call site changes.
 *
 * Only the two keys the app actually reads are provided. Mirroring the whole
 * `.env` would suggest the rest works here too, and most of it — the Firebase
 * native config, the APNs settings — has no meaning in a browser.
 */
const Config = {
  API_BASE_URL: read('VITE_API_BASE_URL', '/api/v1'),
  WS_BASE_URL: read('VITE_WS_BASE_URL', '/ws'),
} as const;

export default Config;
