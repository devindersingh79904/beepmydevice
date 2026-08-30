/**
 * Error banner.
 *
 * Renders every entry in the errors array, not just the first, and dismisses
 * itself after ERROR_AUTO_CLOSE_MS. The user can close it sooner.
 */

import React from 'react';

import type {ApiError} from '@types/api';

interface ErrorAlertProps {
  errors: ApiError[];
  onDismiss: () => void;
  autoCloseMs?: number;
}

export function ErrorAlert({
  errors,
  onDismiss,
  autoCloseMs,
}: ErrorAlertProps): React.JSX.Element | null {
  throw new Error('Not implemented');
}
