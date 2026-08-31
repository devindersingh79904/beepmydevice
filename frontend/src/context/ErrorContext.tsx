/**
 * Error provider.
 *
 * Holds the errors array from the most recent failed request and clears it
 * after ERROR_AUTO_CLOSE_MS. Kept app-wide so a failure raised in a service
 * can surface without every screen wiring up its own banner.
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type {ApiError} from '@/types/api';
import {ERROR_PREFIX} from '@/types/api';
import {ERROR_AUTO_CLOSE_MS} from '@utils/constants';

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
  children,
}: ErrorProviderProps): React.JSX.Element {
  const [errors, setErrors] = useState<ApiError[]>([]);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrors = useCallback((): void => {
    setErrors([]);
  }, []);

  const showErrors = useCallback((next: ApiError[]): void => {
    setErrors(next);
  }, []);

  useEffect(() => {
    if (errors.length === 0) {
      return;
    }
    dismissTimer.current = setTimeout(clearErrors, ERROR_AUTO_CLOSE_MS);
    return () => {
      if (dismissTimer.current !== null) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [clearErrors, errors]);

  const fieldErrors = useMemo((): Record<string, string> => {
    // Only VAL_* errors name a field the user can correct; anything else
    // belongs in the banner, so it is deliberately not mapped here.
    return errors.reduce<Record<string, string>>((accumulator, error) => {
      if (error.code.startsWith(ERROR_PREFIX.VALIDATION) && error.field) {
        accumulator[error.field] = error.message;
      }
      return accumulator;
    }, {});
  }, [errors]);

  const value = useMemo(
    (): ErrorContextValue => ({errors, showErrors, clearErrors, fieldErrors}),
    [clearErrors, errors, fieldErrors, showErrors],
  );

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
}
