/** Push notification permission and token lifecycle. */

import {useCallback, useEffect, useState} from 'react';

import * as notificationService from '@services/notification';
import {getLogger} from '@utils/logger';

const logger = getLogger('use-push-notifications');

export interface UsePushNotificationsResult {
  pushToken: string | null;
  hasPermission: boolean;
  isRequesting: boolean;
  /**
   * False until the first permission request has settled, either way.
   *
   * `pushToken` is null both while the request is still in flight and after
   * the user declines, so it cannot distinguish "no token yet" from "no token
   * ever". Device registration must wait for this: the backend treats the
   * push token as the identity of an app install, so registering once with an
   * empty token and again with a real one leaves two rows for one phone --
   * and the first of them can never be alerted.
   */
  isReady: boolean;
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
  const [isReady, setReady] = useState(false);

  const requestPermission = useCallback(async (): Promise<void> => {
    setRequesting(true);
    try {
      const token = await notificationService.requestPermissionAndGetToken();
      setPushToken(token);

      if (token !== null) {
        notificationService.startListening();
      }
    } finally {
      // Settled either way -- a denied permission is an answer, and
      // registration must not stall waiting for one that will never come.
      setRequesting(false);
      setReady(true);
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
    isReady,
    requestPermission,
  };
}
