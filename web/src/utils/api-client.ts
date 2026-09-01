/**
 * The configured axios instance. There is exactly one.
 *
 * A second instance, or a bare `fetch`, bypasses these interceptors and sends
 * a request with no bearer token and no correlation ID — which fails in a way
 * that looks like a backend bug. Every call in the app goes through here, and
 * every path comes from `API_ROUTES`.
 *
 * Two interceptors carry the cross-cutting concerns so no call site repeats
 * them:
 *
 *   Request  — attaches the bearer token and `X-Correlation-ID`.
 *   Response — unwraps the envelope down to `data.content`, and on any `AUTH_*`
 *              code clears the stored token and signals a logout, so an expired
 *              session cannot leave the app half-authenticated.
 *
 * This is a deliberate mirror of `frontend/src/utils/api-client.ts`. The two
 * differ only in where the token is stored (localStorage here, AsyncStorage
 * there) and where configuration comes from.
 */

import axios from 'axios';
import type {AxiosError, AxiosInstance, AxiosResponse} from 'axios';

import type {ApiError, ApiResponse, Paged, PaginationMeta} from '@/types/api';
import {isAuthError} from '@/types/api';

import {env} from '@/config/env';

import {
  API_TIMEOUT_MS,
  AUTHORIZATION_HEADER,
  CORRELATION_ID_HEADER,
  STORAGE_KEYS,
} from './constants';
import {getCorrelationId} from './correlation';
import {getLogger} from './logger';
import {getItem, removeItem} from './storage';

const logger = getLogger('api-client');

/**
 * Called when the server rejects the session.
 *
 * A module-level slot rather than an import of AuthContext: the context
 * imports this client, so the dependency has to point this way to avoid a
 * cycle.
 */
let unauthorizedHandler: (() => void) | null = null;

/** Register the callback that returns the app to the sign-in screen. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** Fallback used when a failure carries no envelope at all. */
function transportError(message: string): ApiError[] {
  return [{code: 'SYS_001', message}];
}

/**
 * Pull the `errors` array out of a failed response.
 *
 * Three cases have to be told apart, because they need different messages:
 * the server answered with a proper envelope; the server answered with
 * something else (a proxy's HTML 502, say); or nothing answered at all.
 */
function toApiErrors(error: AxiosError<ApiResponse<unknown>>): ApiError[] {
  const body = error.response?.data;

  if (body && Array.isArray(body.errors) && body.errors.length > 0) {
    return body.errors;
  }

  if (error.response) {
    return transportError(
      `The server returned ${error.response.status} without an error body.`,
    );
  }

  if (error.code === 'ECONNABORTED') {
    return transportError('The server took too long to respond.');
  }

  return transportError('Could not reach the server. Check that the API is running.');
}

/** Build the shared axios instance with both interceptors installed. */
function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: env.apiBaseUrl,
    timeout: API_TIMEOUT_MS,
    headers: {'Content-Type': 'application/json'},
  });

  instance.interceptors.request.use(config => {
    const token = getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token !== null && token !== '') {
      config.headers.set(AUTHORIZATION_HEADER, `Bearer ${token}`);
    }
    config.headers.set(CORRELATION_ID_HEADER, getCorrelationId());
    return config;
  });

  instance.interceptors.response.use(
    response => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
      const errors = toApiErrors(error);

      // Logged once, here, rather than at each catch site: this is the only
      // place that still has the request's method, URL and status alongside
      // the decoded error array.
      logger.error(
        `${error.config?.method?.toUpperCase() ?? 'REQUEST'} ${error.config?.url ?? '?'} failed`,
        undefined,
        {
          status: error.response?.status ?? 'no-response',
          codes: errors.map(item => item.code).join(','),
        },
      );

      // The session is gone. Tear it down here rather than at each call site:
      // a screen that forgot to check would otherwise keep rendering against
      // a token the server has already rejected.
      //
      // Note this branches on the error *code*, not on HTTP 401. The two are
      // not the same: a guest device hitting the alert endpoint gets 403 with
      // ALERT_005, which must not log anyone out, and an expired token can
      // surface as 401 with AUTH_002, which must.
      if (errors.some(isAuthError)) {
        removeItem(STORAGE_KEYS.AUTH_TOKEN);
        removeItem(STORAGE_KEYS.SESSION);
        unauthorizedHandler?.();
      }

      return Promise.reject(errors);
    },
  );

  return instance;
}

export const apiClient = createApiClient();

/**
 * Unwrap an envelope down to its payload.
 *
 * The payload is at `response.data.content` — `data` is the envelope's
 * container, and `content` is the thing the endpoint was asked for. Reading
 * `response.data.data` (a shape this API has never returned) yields undefined
 * at every call site, which is why this lives in one function.
 */
function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const {data} = response.data;
  if (data === null || data === undefined) {
    throw transportError('The server returned an empty response body.');
  }
  return data.content;
}

/** GET a single resource. */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(url, {params});
  return unwrap(response);
}

/**
 * GET a paginated collection.
 *
 * Returns the rows and the pagination block together; a caller that ignores
 * pagination and renders `items` gets the first page, which is the sensible
 * default rather than a silent truncation of an unknown total.
 */
export async function getPaged<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<Paged<T>> {
  const response = await apiClient.get<ApiResponse<T[]>>(url, {params});
  const {data} = response.data;
  if (data === null || data === undefined) {
    throw transportError('The server returned an empty response body.');
  }
  return {
    items: data.content,
    pagination: (data.pagination as PaginationMeta | undefined) ?? null,
  };
}

/** POST a body and unwrap the result. */
export async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.post<ApiResponse<T>>(url, body);
  return unwrap(response);
}

/** PUT a body and unwrap the result. */
export async function put<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.put<ApiResponse<T>>(url, body);
  return unwrap(response);
}

/** DELETE a resource. */
export async function del<T>(url: string): Promise<T> {
  const response = await apiClient.delete<ApiResponse<T>>(url);
  return unwrap(response);
}

/**
 * Narrow an unknown thrown value to the error array the interceptor rejects
 * with.
 *
 * Everything thrown out of this module is `ApiError[]`, but a `catch` binding
 * is `unknown` and a genuine programming error (a TypeError in a component)
 * can land in the same handler. This tells them apart so a bug is not
 * displayed to the user as if it were a server message.
 */
export function isApiErrorArray(value: unknown): value is ApiError[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      item =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ApiError).code === 'string' &&
        typeof (item as ApiError).message === 'string',
    )
  );
}

/** Coerce anything thrown into a displayable error array. */
export function toDisplayErrors(value: unknown): ApiError[] {
  if (isApiErrorArray(value)) {
    return value;
  }
  const message = value instanceof Error ? value.message : 'Something went wrong.';
  return transportError(message);
}
