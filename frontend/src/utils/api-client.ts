/**
 * Configured axios instance.
 *
 * Two interceptors carry the cross-cutting concerns so no call site repeats
 * them:
 *
 *   Request  - attaches the Bearer token and the X-Correlation-ID header.
 *   Response - unwraps the envelope, and on any AUTH_* code clears the stored
 *              token and signals a logout, so an expired session cannot leave
 *              the app in a half-authenticated state.
 */

import axios from 'axios';
import type {AxiosInstance, AxiosResponse} from 'axios';
import Config from 'react-native-config';

import type {ApiData, ApiError, ApiResponse} from '@/types/api';
import {SESSION_ENDED_CODES} from '@/types/api';

import {
  API_TIMEOUT_MS,
  AUTHORIZATION_HEADER,
  CORRELATION_ID_HEADER,
  STORAGE_KEYS,
} from './constants';
import {getCorrelationId, getLogger} from './logger';
import {getItem, removeItem} from './storage';

const logger = getLogger('api-client');

/**
 * Called when the server rejects the session.
 *
 * A module-level slot rather than an import of AuthContext: the context
 * imports the client, so the dependency has to point this way to avoid a cycle.
 */
let unauthorizedHandler: (() => void) | null = null;

/** Register the callback that returns the app to the login screen. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** Fallback used when a failure carries no envelope at all. */
function networkError(message: string): ApiError[] {
  return [{code: 'SYS_001', message}];
}

/** Build the shared axios instance with both interceptors installed. */
export function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: Config.API_BASE_URL,
    timeout: API_TIMEOUT_MS,
    headers: {'Content-Type': 'application/json'},
  });

  instance.interceptors.request.use(async config => {
    const token = await getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
    if (token !== null) {
      config.headers[AUTHORIZATION_HEADER] = `Bearer ${token}`;
    }
    config.headers[CORRELATION_ID_HEADER] = getCorrelationId();
    return config;
  });

  instance.interceptors.response.use(
    // Unwrapped once, here, so no call site ever writes response.data.data.
    (response: AxiosResponse<ApiResponse<unknown>>) =>
      ({...response, data: response.data.data}) as AxiosResponse<
        ApiData<unknown>
      >,
    async error => {
      const envelope = axios.isAxiosError(error)
        ? (error.response?.data as ApiResponse<unknown> | undefined)
        : undefined;

      const errors: ApiError[] =
        envelope?.errors && envelope.errors.length > 0
          ? envelope.errors
          : networkError(
              'Could not reach the server. Check your connection and try again.',
            );

      // Only a token that will never work again tears the session down here,
      // rather than leaving screens to discover it one failed request at a
      // time. A permission denial is not that: it is a banner, and the session
      // survives it.
      if (errors.some(item => SESSION_ENDED_CODES.includes(item.code))) {
        logger.warn('Session rejected; clearing stored credentials');
        await removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await removeItem(STORAGE_KEYS.USER);
        unauthorizedHandler?.();
      }

      // Rejected with ApiError[] rather than an AxiosError: every caller in the
      // app handles the same shape, and none of them import axios.
      return Promise.reject(errors);
    },
  );

  return instance;
}

export const apiClient: AxiosInstance = createApiClient();
