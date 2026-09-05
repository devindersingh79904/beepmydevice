/**
 * Registers *this* device and keeps its heartbeat going.
 *
 * Separate from `useDevices`, which is about the devices on the network. This
 * hook is about being one of them: without it the phone never appears in
 * anyone's list and can never be alerted.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import DeviceInfo from 'react-native-device-info';

import * as deviceService from '@services/device';
import {HEARTBEAT_INTERVAL_MS, STORAGE_KEYS} from '@utils/constants';
import {getLogger} from '@utils/logger';
import {getItem, removeItem} from '@utils/storage';

const logger = getLogger('use-device-registration');

/**
 * Distinct from both a user ID and null, which is a signed-out session and a
 * value the account can legitimately hold.
 */
const UNSET_USER = Symbol('unset-user');

export interface UseDeviceRegistrationResult {
  deviceId: string | null;
  /**
   * True when the WiFi BSSID could not be read.
   *
   * The app cannot function without it -- there is no alert group to join --
   * so the UI must prompt for location permission rather than fail quietly.
   */
  needsLocationPermission: boolean;
}

/**
 * @param pushToken - Token from usePushNotifications, or null if declined.
 *   Registration still proceeds without one: the device stays visible on the
 *   dashboard, it simply cannot be reached.
 * @param isPushReady - `isReady` from usePushNotifications. Nothing registers
 *   until this is true; see the comment on the effect below.
 * @param userId - The signed-in user, or null while signed out. Registration
 *   redoes itself whenever this changes: a device row belongs to one account,
 *   so the row created before signing in is not this user's.
 */
export function useDeviceRegistration(
  pushToken: string | null,
  isPushReady: boolean,
  userId: string | null,
): UseDeviceRegistrationResult {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [needsLocationPermission, setNeedsLocationPermission] = useState(false);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  /**
   * Guards against two registrations overlapping.
   *
   * `register` is rebuilt whenever `pushToken` changes, which re-runs the
   * effect below. State cannot serve as the guard: a re-render is scheduled,
   * not immediate, so both calls would read the old value and both proceed.
   */
  const isRegistering = useRef(false);
  /** Previous value of `userId`, to tell a sign-in from the first render. */
  const previousUserId = useRef<string | null | typeof UNSET_USER>(UNSET_USER);

  const register = useCallback(async (): Promise<void> => {
    if (isRegistering.current) {
      return;
    }
    const wifiMac = await deviceService.getWifiMacAddress();
    if (wifiMac === null) {
      setNeedsLocationPermission(true);
      return;
    }
    setNeedsLocationPermission(false);

    isRegistering.current = true;
    try {
      const registeredId = await deviceService.registerDevice({
        device_name: await DeviceInfo.getDeviceName(),
        device_type: deviceService.detectDeviceType(),
        device_os_version: DeviceInfo.getSystemVersion(),
        push_token: pushToken ?? '',
        wifi_mac: wifiMac,
        network_name: (await deviceService.getWifiNetworkName()) ?? undefined,
      });
      setDeviceId(registeredId);
    } catch (error) {
      // A failed registration is not fatal to the session: the user can still
      // see the network, they are simply not on it yet.
      logger.error('Could not register this device', error);
    } finally {
      isRegistering.current = false;
    }
  }, [pushToken]);

  /**
   * Drop the previous session's device when the account changes.
   *
   * The stored ID belongs to whoever was signed in when it was written. Left
   * in place across a sign-in, the heartbeat keeps addressing it every 30
   * seconds and the server answers AUTH_004 -- the caller does not administer
   * that device's network -- for as long as the app is open.
   *
   * Skipped on the first run: there is no previous account to leave, and
   * clearing here would throw away the ID the effect below is about to
   * restore.
   */
  useEffect(() => {
    if (previousUserId.current === userId) {
      return;
    }
    const wasSignedOut = previousUserId.current === null;
    const isFirstRun = previousUserId.current === UNSET_USER;
    previousUserId.current = userId;
    if (isFirstRun) {
      return;
    }

    const abandonPreviousDevice = async (): Promise<void> => {
      const stored = await getItem<string>(STORAGE_KEYS.DEVICE_ID);
      await removeItem(STORAGE_KEYS.DEVICE_ID);

      /**
       * Signing in retires the guest row this install just created.
       *
       * Sitting on the login screen registers this phone as a guest, and
       * signing in registers it again as owned -- the backend keys a device on
       * its push token *and* its ownership, so the two are different rows and
       * the phone appears twice in its own owner's list. Only the guest row is
       * removed, and only on the signed-out-to-signed-in transition: signing
       * *out* abandons the owned row, which is the user's real device and must
       * survive.
       *
       * Best effort. A failure here leaves a stale row the admin can delete,
       * which is better than blocking the sign-in that triggered it.
       */
      if (stored !== null && wasSignedOut && userId !== null) {
        try {
          await deviceService.removeDevice(stored);
        } catch (error) {
          logger.warn('Could not retire the guest device row');
        }
      }
    };

    setDeviceId(null);
    abandonPreviousDevice().catch(error =>
      logger.error('Could not clear the stored device ID', error),
    );
  }, [userId]);

  useEffect(() => {
    /**
     * Nothing registers until the push token has settled.
     *
     * The backend identifies an app install by its push token, so registering
     * on mount with an empty one and again when the real token arrives creates
     * two rows for one phone -- the phone appears twice in the dashboard, and
     * the first row, holding no token, fails every alert sent to it with
     * ALERT_004. Waiting costs one permission round-trip at startup and is the
     * difference between one alertable device and two half-broken ones.
     */
    if (!isPushReady) {
      return;
    }

    const restoreAndRegister = async (): Promise<void> => {
      // A previous launch already registered; reuse that ID rather than
      // creating a second row for the same phone.
      const stored = await getItem<string>(STORAGE_KEYS.DEVICE_ID);
      if (stored !== null) {
        setDeviceId(stored);
      }
      await register();
    };
    restoreAndRegister().catch(error =>
      logger.error('Device registration failed', error),
    );
  }, [register, isPushReady, userId]);

  useEffect(() => {
    if (deviceId === null) {
      return;
    }

    const beat = async (): Promise<void> => {
      const wifiMac = await deviceService.getWifiMacAddress();
      if (wifiMac === null) {
        setNeedsLocationPermission(true);
        return;
      }
      try {
        await deviceService.sendHeartbeat(deviceId, {
          battery_level: await deviceService.getBatteryLevel(),
          wifi_mac: wifiMac,
        });
      } catch (error) {
        // Heartbeats are expected to fail while offline; the next tick retries
        // and the server marks the device offline on its own schedule.
        logger.debug('Heartbeat failed');
      }
    };

    const runBeat = (): void => {
      beat().catch(() => undefined);
    };

    runBeat();
    heartbeatTimer.current = setInterval(runBeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatTimer.current !== null) {
        clearInterval(heartbeatTimer.current);
      }
    };
  }, [deviceId]);

  return {deviceId, needsLocationPermission};
}
