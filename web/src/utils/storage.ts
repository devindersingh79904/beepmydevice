/**
 * Browser storage, wrapped.
 *
 * `localStorage` throws rather than returning null in a few real situations —
 * Safari's private mode, a browser configured to block site data, an iframe
 * with third-party storage partitioned off. An unguarded read in the axios
 * interceptor would take down every request in the app for a user whose
 * browser is merely strict, so each access is guarded and degrades to "no
 * value stored".
 *
 * The token lives here rather than in a cookie because the API authenticates
 * with a bearer header, not a session cookie: there is no cookie for a browser
 * to attach, and storing one would invite CSRF for no benefit. The tradeoff is
 * that any script running on this origin can read it — which is why the app
 * ships no third-party scripts and no user-authored HTML is ever rendered.
 */

const memory = new Map<string, string>();

/**
 * True when the browser will actually persist a value.
 *
 * Probed once with a real write, because the API can exist and still throw.
 */
const persistent: boolean = ((): boolean => {
  try {
    const probe = '__bmd_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
})();

/**
 * Read a stored string, or null.
 *
 * Falls back to an in-memory map when storage is unavailable, so the session
 * still works for as long as the tab is open rather than failing to sign in.
 */
export function getItem(key: string): string | null {
  if (!persistent) {
    return memory.get(key) ?? null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Store a string. Silently degrades to memory when storage is blocked. */
export function setItem(key: string, value: string): void {
  if (!persistent) {
    memory.set(key, value);
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

/** Remove a key from both storage and the in-memory fallback. */
export function removeItem(key: string): void {
  memory.delete(key);
  if (!persistent) {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do: the value is already unreachable.
  }
}

/**
 * Read and parse a JSON value, or null.
 *
 * A malformed value is treated as absent rather than thrown: the only way one
 * gets there is a half-written record or a version skew, and neither is worth
 * a white screen.
 */
export function getJson<T>(key: string): T | null {
  const raw = getItem(key);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    removeItem(key);
    return null;
  }
}

/** Store a value as JSON. */
export function setJson(key: string, value: unknown): void {
  setItem(key, JSON.stringify(value));
}
