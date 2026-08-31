/**
 * Push notification setup and the alert reaction.
 *
 * Registration differs by platform (Firebase on Android, native APNs on iOS)
 * but both funnel into one push token that the backend stores per device.
 */

import {Vibration} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import type {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import Sound from 'react-native-sound';

import {ALERT_SOUND_FILE, ALERT_VIBRATION_PATTERN} from '@utils/constants';
import {getLogger} from '@utils/logger';

const logger = getLogger('notification-service');

/** Unsubscribe handles for the listeners started by {@link startListening}. */
let foregroundUnsubscribe: (() => void) | null = null;
let alertSound: Sound | null = null;

/**
 * Request notification permission and return the push token.
 *
 * Returns null when the user declines -- the device is still registered and
 * visible on the dashboard, but cannot be alerted, and the UI must say so.
 */
export async function requestPermissionAndGetToken(): Promise<string | null> {
  try {
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

/** Play the alert at full volume and vibrate. */
function ring(): void {
  Vibration.vibrate(ALERT_VIBRATION_PATTERN);

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
        ring();
      }
    },
  );

  // A background alert is delivered by the OS notification; this handler exists
  // so the payload is acknowledged rather than dropped.
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
