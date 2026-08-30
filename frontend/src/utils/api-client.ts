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

import axios, {type AxiosInstance} from 'axios';

/** Build the shared axios instance with both interceptors installed. */
export function createApiClient(): AxiosInstance {
  throw new Error('Not implemented');
}

export const apiClient: AxiosInstance = createApiClient();
