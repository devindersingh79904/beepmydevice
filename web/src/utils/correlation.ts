/**
 * The correlation ID.
 *
 * One UUID per client session, sent on every request as `X-Correlation-ID`.
 * The backend binds it to a ContextVar so every log line the request produces
 * carries it, which is what makes "the dashboard showed an error at 14:02"
 * greppable across the API, the database layer and the push provider.
 *
 * It is never passed as a function argument just so something can log it —
 * the header carries it, and the server picks it up.
 */

import {STORAGE_KEYS} from './constants';
import {getItem, setItem} from './storage';

/** Bytes in a UUID, and the format's version and variant bit masks. */
const UUID_BYTES = 16;
const BYTE_VALUES = 256;
const VERSION_BYTE = 6;
const VARIANT_BYTE = 8;
const VERSION_MASK = 0x0f;
const VERSION_4 = 0x40;
const VARIANT_MASK = 0x3f;
const VARIANT_RFC4122 = 0x80;

/** The canonical 8-4-4-4-12 grouping, as a pattern rather than as offsets. */
const UUID_GROUPING = /^(.{8})(.{4})(.{4})(.{4})(.{12})$/;

/**
 * Generate a UUID v4.
 *
 * `crypto.randomUUID` needs a secure context, so it is missing on a plain
 * `http://192.168.x.x` origin — which is exactly how this dashboard gets
 * opened on a home network. The fallback uses `getRandomValues`, which has no
 * such requirement, and only falls back again to `Math.random` if even that is
 * absent. A correlation ID is a log key, not a secret, so a weak one degrades
 * traceability rather than security.
 */
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(UUID_BYTES);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * BYTE_VALUES);
    }
  }

  // Set the version (4) and variant bits the format requires.
  bytes[VERSION_BYTE] = ((bytes[VERSION_BYTE] ?? 0) & VERSION_MASK) | VERSION_4;
  bytes[VARIANT_BYTE] = ((bytes[VARIANT_BYTE] ?? 0) & VARIANT_MASK) | VARIANT_RFC4122;

  const HEX = 16;
  const PAIR = 2;
  const hex = Array.from(bytes, byte => byte.toString(HEX).padStart(PAIR, '0')).join('');
  return hex.replace(UUID_GROUPING, '$1-$2-$3-$4-$5');
}

let cached: string | null = null;

/**
 * The correlation ID for this session, minted once and reused.
 *
 * Persisted so a reload keeps the same thread — a user who refreshes after an
 * error is still the same investigation.
 */
export function getCorrelationId(): string {
  if (cached !== null) {
    return cached;
  }

  const stored = getItem(STORAGE_KEYS.CORRELATION_ID);
  if (stored !== null && stored !== '') {
    cached = stored;
    return cached;
  }

  cached = uuid();
  setItem(STORAGE_KEYS.CORRELATION_ID, cached);
  return cached;
}
