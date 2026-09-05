/**
 * Push notification setup and the alert reaction.
 *
 * Registration differs by platform (Firebase on Android, native APNs on iOS)
 * but both funnel into one push token that the backend stores per device.
 */

import {PermissionsAndroid, Platform, Vibration} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import type {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import Sound from 'react-native-sound';

import {
  ALERT_SOUND_FILE,
  ALERT_VIBRATION_PATTERN,
  ANDROID_NOTIFICATION_PERMISSION_SDK,
} from '@utils/constants';
import {getLogger} from '@utils/logger';

const logger = getLogger('notification-service');

/** Unsubscribe handles for the listeners started by {@link startListening}. */
let foregroundUnsubscribe: (() => void) | null = null;
let alertSound: Sound | null = null;

/**
 * Ask for the notification permission Android 13+ requires.
 *
 * `messaging().requestPermission()` cannot do this: on Android the library
 * returns AUTHORIZED without asking anything, so the app would hold a valid
 * FCM token, believe it could be alerted, and have every notification dropped
 * by the OS -- the one failure this app cannot afford, and one that is
 * invisible until an alert does not arrive.
 *
 * @returns True when the permission is granted.
 */
async function ensureAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // iOS raises its own prompt through messaging().requestPermission().
    return true;
  }
  if (Number(Platform.Version) < ANDROID_NOTIFICATION_PERMISSION_SDK) {
    // Granted at install time before Android 13; the permission string does
    // not exist there, and asking for it fails rather than passing.
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Request notification permission and return the push token.
 *
 * Returns null when the user declines -- the device is still registered and
 * visible on the dashboard, but cannot be alerted, and the UI must say so.
 */
export async function requestPermissionAndGetToken(): Promise<string | null> {
  try {
    if (!(await ensureAndroidNotificationPermission())) {
      logger.warn(
        'Notification permission denied; this device cannot be alerted',
      );
      return null;
    }

    const status = await messaging().requestPermission();
    const granted =
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL;

    if (!granted) {
      logger.warn(
        'Notification permission denied; this device cannot be alerted',
      );
      return null;
    }

    // On iOS this is still the FCM token: Firebase forwards through APNs, so
    // the backend stores one token shape per device either way.
    return await messaging().getToken();
  } catch (error) {
    logger.error('Could not obtain a push token', error);
    return null;
  }
}

/**
 * Play the alert at full volume and vibrate.
 *
 * This is the *foreground* path only, and it is the rarer one: it runs when
 * the app happens to be open, in which case Android draws no notification and
 * hands the message straight to JavaScript. Every other case -- backgrounded,
 * killed, screen locked, which is to say every case where somebody is actually
 * looking for the phone -- is played by the system from the notification
 * channel, with no JavaScript involved at all. See AlertChannels.kt.
 *
 * @param style Presentation flags from the push payload. Sent by the server
 *   because the phone is usually not running to consult its own settings.
 */
function ring(style: AlertStyle): void {
  if (style.vibration) {
    Vibration.vibrate(ALERT_VIBRATION_PATTERN);
  }
  if (!style.sound) {
    return;
  }

  // Ducking and the silent switch are both overridden: an alert the owner
  // cannot hear defeats the entire purpose of the app.
  Sound.setCategory('Playback', false);
  alertSound = new Sound(ALERT_SOUND_FILE, Sound.MAIN_BUNDLE, error => {
    if (error) {
      logger.error('Could not load the alert sound', error);
      return;
    }
    alertSound?.setVolume(1);
    alertSound?.play(() => {
      alertSound?.release();
      alertSound = null;
    });
  });
}

/** How the server asked this alert to present itself. */
interface AlertStyle {
  sound: boolean;
  vibration: boolean;
}

/**
 * Read the presentation flags out of a push payload.
 *
 * FCM data values are strings, so a JSON boolean does not survive the trip;
 * anything missing or unrecognised falls back to on, because an alert that
 * arrives silently by accident is the failure this app cannot afford.
 */
function styleOf(
  data: FirebaseMessagingTypes.RemoteMessage['data'],
): AlertStyle {
  return {
    sound: data?.sound !== 'false',
    vibration: data?.vibration !== 'false',
  };
}

/**
 * Start listening for incoming alerts.
 *
 * On receipt the device plays the alert sound at full volume and vibrates,
 * ignoring the silent switch -- an alert the owner cannot hear defeats the
 * entire purpose of the app.
 */
export function startListening(): void {
  stopListening();

  foregroundUnsubscribe = messaging().onMessage(
    async (message: FirebaseMessagingTypes.RemoteMessage) => {
      if (message.data?.type === 'alert') {
        logger.info('Alert received');
        ring(styleOf(message.data));
      }
    },
  );

  // A background alert is played by Android itself, from the notification
  // channel named in the payload. This handler must NOT ring as well: it would
  // double up the sound against the system's, and it cannot run at all once
  // the app is killed -- which is exactly when an alert matters most. It
  // exists only so the message is acknowledged rather than dropped.
  messaging().setBackgroundMessageHandler(async () => undefined);
}

/** Stop listening. Called on logout. */
export function stopListening(): void {
  foregroundUnsubscribe?.();
  foregroundUnsubscribe = null;
  Vibration.cancel();
  alertSound?.release();
  alertSound = null;
}

/**
 * Register a callback for token rotation.
 *
 * The platform can rotate the token at any time; the new value must be pushed
 * to the backend immediately or alerts silently stop arriving.
 */
export function onTokenRefresh(callback: (token: string) => void): () => void {
  return messaging().onTokenRefresh(callback);
}
