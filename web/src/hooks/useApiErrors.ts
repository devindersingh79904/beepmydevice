/**
 * Error state for a screen or a form.
 *
 * The display contract is fixed and shared with the mobile app:
 *
 *   `AUTH_*` — the session is over. Already handled in the axios interceptor;
 *              a screen never renders these.
 *   `VAL_*`  — highlight the named field and print the message under it.
 *   anything else — a banner that closes itself after five seconds.
 *
 * Every entry in the array is rendered, not just the first: a registration
 * form can fail on the email and the password at once, and showing one of them
 * makes the user fix half the problem and submit again.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {ApiError} from '@/types/api';
import {isValidationError} from '@/types/api';
import {toDisplayErrors} from '@/utils/api-client';
import {BANNER_AUTO_DISMISS_MS} from '@/utils/constants';

interface ApiErrorState {
  /** Everything that is not a field error — render these in a banner. */
  banner: ApiError[];
  /** Field name to message, for errors that name a field. */
  fields: Record<string, string>;
  /** Record a thrown value. */
  capture: (error: unknown) => void;
  /** Clear everything, e.g. when a form is resubmitted. */
  clear: () => void;
}

export function useApiErrors(): ApiErrorState {
  const [errors, setErrors] = useState<ApiError[]>([]);
  const timerRef = useRef<number>();

  const clear = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setErrors([]);
  }, []);

  const capture = useCallback((error: unknown) => {
    // AUTH_* is dropped here rather than displayed: the interceptor has
    // already torn the session down, and the user is on their way to the
    // sign-in screen. An error banner about it would arrive on that screen
    // and read as a failed sign-in.
    setErrors(toDisplayErrors(error).filter(item => !item.code.startsWith('AUTH_')));
  }, []);

  const {banner, fields} = useMemo(() => {
    const bannerErrors: ApiError[] = [];
    const fieldErrors: Record<string, string> = {};

    for (const error of errors) {
      // A field error is one that names a field. Most are VAL_*, but the API
      // also attaches a field to some domain errors -- an unknown wifi_mac on
      // registration, for one -- and those belong under the input too.
      if (error.field !== undefined && error.field !== '') {
        fieldErrors[error.field] = error.message;
      } else if (!isValidationError(error)) {
        bannerErrors.push(error);
      } else {
        // A VAL_* with no field cannot be attached to an input, so it still
        // has to be said somewhere.
        bannerErrors.push(error);
      }
    }

    return {banner: bannerErrors, fields: fieldErrors};
  }, [errors]);

  // The banner closes itself; field errors do not, because they stay relevant
  // until the value they refer to is changed.
  useEffect(() => {
    window.clearTimeout(timerRef.current);
    if (banner.length === 0) {
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setErrors(current => current.filter(item => item.field !== undefined && item.field !== ''));
    }, BANNER_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timerRef.current);
  }, [banner]);

  return {banner, fields, capture, clear};
}
