/**
 * Types for the API response envelope.
 *
 * Every backend endpoint returns the same shape, so these types are the single
 * contract the whole app parses against. They mirror
 * `backend/src/utils/responses.py` -- change one and you must change the other.
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

/** The `data` object. `content` holds the payload for single and list results alike. */
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

/** Query parameters accepted by list endpoints. */
export interface PaginationParams {
  page?: number;
  limit?: number;
  /** Field name; prefix with `-` for descending, e.g. `-created_at`. */
  sort?: string;
}

/**
 * Error code prefixes the UI branches on.
 *
 * `VAL_*` highlights form fields, everything else shows a dismissible banner.
 * Logging out is decided by {@link SESSION_ENDED_CODES}, not by the `AUTH_`
 * prefix -- see the note there.
 */
export const ERROR_PREFIX = {
  AUTH: 'AUTH_',
  DEVICE: 'DEVICE_',
  ALERT: 'ALERT_',
  VALIDATION: 'VAL_',
} as const;

/**
 * The codes that mean this token will never work again.
 *
 * Not the whole `AUTH_` prefix. AUTH_004 is *authorisation* -- "you may not do
 * that" -- and arrives with a 403 from a perfectly valid session: asking for a
 * network someone else administers returns it, which happens the moment a
 * second account joins a WiFi the first one claimed. Treating it as an expired
 * session logged the user out mid-use and sent them back to sign in, where
 * signing in worked, because nothing was ever wrong with the token.
 *
 * AUTH_001 is a failed sign-in attempt; there is no session to end.
 */
export const SESSION_ENDED_CODES: readonly string[] = ['AUTH_002', 'AUTH_003'];
