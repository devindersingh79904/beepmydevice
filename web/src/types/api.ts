/**
 * Types for the API response envelope.
 *
 * A deliberate mirror of `frontend/src/types/api.ts`, which in turn mirrors
 * `backend/src/utils/responses.py`. All three describe one wire format;
 * change one and you must change the others.
 *
 * The web dashboard does not import the mobile app's copy: that file is part
 * of a React Native bundle, and reaching across into it would drag Metro's
 * module resolution into a Vite build for the sake of forty lines. The cost
 * of the duplicate is a test — `src/types/api.test.ts` reads the mobile file
 * and fails if the two shapes diverge.
 */

/** One entry in the `errors` array. Always an array, even for a single error. */
export interface ApiError {
  /** Stable code from the shared vocabulary, e.g. `AUTH_002`. */
  code: string;
  /** User-facing text, safe to display as-is. */
  message: string;
  /** Present for validation failures; names the offending request field. */
  field?: string;
}

/** Pagination block returned under `data.pagination` on list endpoints. */
export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_count: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * The `data` object.
 *
 * `content` holds the payload for single and list results alike — this is the
 * single most-missed detail of the envelope. The payload is at
 * `response.data.content`, never `response.data`.
 */
export interface ApiData<T> {
  content: T;
  pagination?: PaginationMeta;
}

/** The complete envelope returned by every endpoint. */
export interface ApiResponse<T> {
  success: boolean;
  status_code: number;
  data: ApiData<T> | null;
  errors: ApiError[];
  correlation_id: string;
  timestamp: string;
  message?: string;
}

/** A list result with its pagination, as the hooks pass it around. */
export interface Paged<T> {
  items: T[];
  pagination: PaginationMeta | null;
}

/**
 * Error code prefixes the UI branches on.
 *
 * `AUTH_*` forces a logout, `VAL_*` highlights the named field, everything
 * else shows a banner that closes itself. Every entry in the array is
 * rendered, not just the first.
 */
export const ERROR_PREFIX = {
  AUTH: 'AUTH_',
  DEVICE: 'DEVICE_',
  ALERT: 'ALERT_',
  VALIDATION: 'VAL_',
} as const;

/** True when this error should end the session. */
export function isAuthError(error: ApiError): boolean {
  return error.code.startsWith(ERROR_PREFIX.AUTH);
}

/** True when this error names a form field the user can correct. */
export function isValidationError(error: ApiError): boolean {
  return error.code.startsWith(ERROR_PREFIX.VALIDATION);
}
