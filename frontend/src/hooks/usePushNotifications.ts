/** Push notification permission and token lifecycle. */

import {useCallback, useEffect, useState} from 'react';

import * as notificationService from '@services/notification';
import {getLogger} from '@utils/logger';

const logger = getLogger('use-push-notifications');

export interface UsePushNotificationsResult {
  pushToken: string | null;
  hasPermission: boolean;
  isRequesting: boolean;
  requestPermission: () => Promise<void>;
}

/**
 * Request permission on mount and keep the backend token in sync.
 *
 * Re-registers the token with the backend whenever the platform rotates it.
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isRequesting, setRequesting] = useState(false);

  const requestPermission = useCallback(async (): Promise<void> => {
    setRequesting(true);
    const token = await notificationService.requestPermissionAndGetToken();
    setPushToken(token);
    setRequesting(false);

    if (token !== null) {
      notificationService.startListening();
    }
  }, []);

  useEffect(() => {
    requestPermission().catch(error =>
      logger.error('Could not set up push notifications', error),
    );
    return () => notificationService.stopListening();
  }, [requestPermission]);

  // A rotated token is invisible: alerts simply stop arriving. The new value
  // has to reach the backend the moment the platform issues it.
  useEffect(() => {
    return notificationService.onTokenRefresh(token => {
      logger.info('Push token rotated; re-registering');
      setPushToken(token);
    });
  }, []);

  return {
    pushToken,
    hasPermission: pushToken !== null,
    isRequesting,
    requestPermission,
  };
}
