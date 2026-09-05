/** Notification preferences, loaded from and written back to the server. */

import {useCallback, useEffect, useState} from 'react';

import * as authService from '@services/auth';
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
} from '@/types/user';
import {getLogger} from '@utils/logger';

const logger = getLogger('use-preferences');

/** What a fresh account gets, and what the UI shows before the load returns. */
const DEFAULTS: NotificationPreferences = {
  notifications_enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  // Off, unlike the rest: overriding the phone's silent switch is something
  // the user asks for, never something the app assumes.
  alert_on_silent: false,
};

export interface UsePreferencesResult {
  preferences: NotificationPreferences;
  isLoading: boolean;
  /** Flip one toggle. Applied immediately, reverted if the server refuses. */
  setPreference: (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => Promise<void>;
}

export function usePreferences(): UsePreferencesResult {
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULTS);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .getPreferences()
      .then(setPreferences)
      .catch(error => logger.error('Could not load preferences', error))
      .finally(() => setLoading(false));
  }, []);

  const setPreference = useCallback(
    async (
      key: keyof NotificationPreferences,
      value: boolean,
    ): Promise<void> => {
      // Applied first so the switch moves under the user's finger rather than
      // after a round trip, then rolled back if the server disagrees.
      const previous = preferences;
      setPreferences({...preferences, [key]: value});

      const changes: NotificationPreferencesUpdate = {[key]: value};
      try {
        setPreferences(await authService.updatePreferences(changes));
      } catch (error) {
        logger.error('Could not save preferences', error);
        setPreferences(previous);
      }
    },
    [preferences],
  );

  return {preferences, isLoading, setPreference};
}
