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
 * `AUTH_*` forces a logout, `VAL_*` highlights form fields, everything else
 * shows a dismissible banner.
 */
export const ERROR_PREFIX = {
  AUTH: 'AUTH_',
  DEVICE: 'DEVICE_',
  ALERT: 'ALERT_',
  VALIDATION: 'VAL_',
} as const;
