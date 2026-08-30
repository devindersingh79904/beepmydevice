/** Push notification permission and token lifecycle. */

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
  throw new Error('Not implemented');
}
