/**
 * Thin transport layer over the API client.
 *
 * Unwraps the response envelope so callers receive plain typed payloads and
 * never touch `data.content` themselves. Failures are thrown as ApiError[] for
 * the error context to render.
 */

import type {ApiError, PaginationMeta, PaginationParams} from '@types/api';

/** GET returning a single object. */
export async function get<T>(path: string): Promise<T> {
  throw new Error('Not implemented');
}

/** GET returning a page of objects plus its pagination block. */
export async function getPaginated<T>(
  path: string,
  params?: PaginationParams,
): Promise<{items: T[]; pagination: PaginationMeta}> {
  throw new Error('Not implemented');
}

/** POST returning a single object. */
export async function post<TRequest, TResponse>(
  path: string,
  body: TRequest,
): Promise<TResponse> {
  throw new Error('Not implemented');
}

/** PUT returning a single object. */
export async function put<TRequest, TResponse>(
  path: string,
  body: TRequest,
): Promise<TResponse> {
  throw new Error('Not implemented');
}

/** DELETE. */
export async function remove(path: string): Promise<void> {
  throw new Error('Not implemented');
}

/** Type guard for the ApiError[] thrown by the functions above. */
export function isApiErrorArray(value: unknown): value is ApiError[] {
  throw new Error('Not implemented');
}
