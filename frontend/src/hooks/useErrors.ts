/** Access the error context. */

import type {ApiError} from '@/types/api';

export interface UseErrorsResult {
  errors: ApiError[];
  /** Show errors in the banner; they auto-dismiss after ERROR_AUTO_CLOSE_MS. */
  showErrors: (errors: ApiError[]) => void;
  clearErrors: () => void;
  /** Errors keyed by field, for inline form highlighting. */
  fieldErrors: Record<string, string>;
}

/**
 * Return the current errors and the actions to raise or clear them.
 *
 * @throws If called outside an ErrorProvider.
 */
export function useErrors(): UseErrorsResult {
  throw new Error('Not implemented');
}
