/**
 * Thin transport layer over the API client.
 *
 * Unwraps the response envelope so callers receive plain typed payloads and
 * never touch `data.content` themselves. Failures are thrown as ApiError[] for
 * the error context to render.
 */

import type {
  ApiData,
  ApiError,
  PaginationMeta,
  PaginationParams,
} from '@/types/api';
import {apiClient} from '@utils/api-client';

/** GET returning a single object. */
export async function get<T>(path: string): Promise<T> {
  const response = await apiClient.get<ApiData<T>>(path);
  return response.data.content;
}

/** GET returning a page of objects plus its pagination block. */
export async function getPaginated<T>(
  path: string,
  params?: PaginationParams,
): Promise<{items: T[]; pagination: PaginationMeta}> {
  const response = await apiClient.get<ApiData<T[]>>(path, {params});
  return {
    items: response.data.content,
    // The backend always sends pagination on a list endpoint; the fallback
    // keeps a malformed response from crashing a screen mid-render.
    pagination: response.data.pagination ?? {
      current_page: 1,
      total_pages: 1,
      total_count: response.data.content.length,
      page_size: response.data.content.length,
      has_next: false,
      has_prev: false,
    },
  };
}

/** POST returning a single object. */
export async function post<TRequest, TResponse>(
  path: string,
  body: TRequest,
): Promise<TResponse> {
  const response = await apiClient.post<ApiData<TResponse>>(path, body);
  return response.data.content;
}

/** PUT returning a single object. */
export async function put<TRequest, TResponse>(
  path: string,
  body: TRequest,
): Promise<TResponse> {
  const response = await apiClient.put<ApiData<TResponse>>(path, body);
  return response.data.content;
}

/** DELETE. */
export async function remove(path: string): Promise<void> {
  await apiClient.delete(path);
}

/** Type guard for the ApiError[] thrown by the functions above. */
export function isApiErrorArray(value: unknown): value is ApiError[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ApiError).code === 'string' &&
        typeof (item as ApiError).message === 'string',
    )
  );
}
