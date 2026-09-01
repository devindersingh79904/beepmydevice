/**
 * Notification preferences.
 *
 * Read once per screen that needs them. They change rarely and are small, so
 * there is nothing to gain from a shared cache and something to lose: a stale
 * copy shown next to a toggle the user just moved.
 */

import {useCallback, useEffect, useState} from 'react';

import * as authService from '@/services/auth.service';
import type {NotificationPreferences} from '@/types/models';

interface PreferencesState {
  preferences: NotificationPreferences | null;
  /** Replace the local copy with what the server echoed back after a write. */
  setPreferences: (next: NotificationPreferences) => void;
}

export function usePreferences(enabled: boolean = true): PreferencesState {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const value = await authService.getPreferences();
        if (!cancelled) {
          setPreferences(value);
        }
      } catch {
        // Left null. Every control bound to these renders disabled while they
        // are unknown, which is better than defaulting to "on" and letting a
        // user believe they have changed a setting that never loaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const replace = useCallback((next: NotificationPreferences) => setPreferences(next), []);

  return {preferences, setPreferences: replace};
}
