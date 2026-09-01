/**
 * `react-native-push-notification` on the web.
 *
 * Local notification scheduling and channel management, neither of which has a
 * browser equivalent that would help here: the Notifications API shows a
 * banner, it does not ring a phone at full volume through a silent switch,
 * which is what this app's notifications are for.
 *
 * A no-op rather than a Notifications API bridge, so nothing in a browser can
 * appear to have scheduled an alert that will never fire.
 */

const PushNotification = {
  configure: (): void => undefined,
  createChannel: (_channel: unknown, callback?: (created: boolean) => void): void => {
    callback?.(false);
  },
  localNotification: (): void => undefined,
  cancelAllLocalNotifications: (): void => undefined,
  removeAllDeliveredNotifications: (): void => undefined,
  requestPermissions: async (): Promise<{alert: boolean; badge: boolean; sound: boolean}> => ({
    alert: false,
    badge: false,
    sound: false,
  }),
};

/** Android importance levels, kept so call sites compile unchanged. */
export const Importance = {
  DEFAULT: 3,
  HIGH: 4,
  LOW: 2,
  MAX: 5,
  MIN: 1,
  NONE: 0,
} as const;

export default PushNotification;
