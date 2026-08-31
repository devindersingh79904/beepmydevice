/**
 * Error provider.
 *
 * Holds the errors array from the most recent failed request and clears it
 * after ERROR_AUTO_CLOSE_MS. Kept app-wide so a failure raised in a service
 * can surface without every screen wiring up its own banner.
 */

import React, {createContext, type ReactNode} from 'react';

import type {ApiError} from '@/types/api';

export interface ErrorContextValue {
  errors: ApiError[];
  showErrors: (errors: ApiError[]) => void;
  clearErrors: () => void;
  fieldErrors: Record<string, string>;
}

export const ErrorContext = createContext<ErrorContextValue | undefined>(
  undefined,
);

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({
  children: _children,
}: ErrorProviderProps): React.JSX.Element {
  throw new Error('Not implemented');
}
