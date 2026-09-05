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
 * @param isAuthReady - False while the stored session is still being restored.
 *   Required, and not merely an optimisation: during the restore `userId` is
 *   null for a signed-in user, which is indistinguishable from being signed
 *   out. Acting on that reads a returning user as a fresh sign-in and retires
 *   the device row they already had.
 */
export function useDeviceRegistration(
  pushToken: string | null,
  isPushReady: boolean,
  userId: string | null,
  isAuthReady: boolean,
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
  /**
   * The BSSID this device's row currently belongs to.
   *
   * A router's two radios advertise different BSSIDs, and so does every node
   * of a mesh, so walking upstairs changes this without anything changing
   * about where the phone is. The row has to follow, or it sits in the
   * dashboard as "off network" -- unalertable -- for a phone that is right
   * there.
   */
  const registeredMac = useRef<string | null>(null);

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
        // ANDROID_ID on Android, identifierForVendor on iOS: it survives a
        // reinstall, which the push token does not, so reinstalling updates
        // this phone's row instead of adding another one beside it.
        install_id: await DeviceInfo.getUniqueId(),
        push_token: pushToken ?? '',
        wifi_mac: wifiMac,
        network_name: (await deviceService.getWifiNetworkName()) ?? undefined,
      });
      setDeviceId(registeredId);
      registeredMac.current = wifiMac;
    } catch (error) {
      // A failed registration is not fatal to the session: the user can still
      // see the network, they are simply not on it yet.
      logger.error('Could not register this device', error);
    } finally {
      isRegistering.current = false;
    }
  }, [pushToken]);

  useEffect(() => {
    /**
     * Nothing happens until both the push token and the session have settled.
     *
     * The backend identifies an app install by its push token, so registering
     * on mount with an empty one and again when the real token arrives creates
     * two rows for one phone -- the phone appears twice, and the first row,
     * holding no token, fails every alert sent to it with ALERT_004.
     *
     * `isAuthReady` matters just as much: while the stored session is being
     * restored, `userId` is null for a user who is in fact signed in.
     */
    if (!isPushReady || !isAuthReady) {
      return;
    }

    /**
     * One sequential pass, deliberately not two effects.
     *
     * Retiring the old row and registering the new one both key on `userId`,
     * and as separate effects they raced: registration would store the new
     * device ID before the retire step read storage, so the retire deleted the
     * row it had just created and the phone vanished from the dashboard.
     */
    const settle = async (): Promise<void> => {
      const stored = await getItem<string>(STORAGE_KEYS.DEVICE_ID);
      const previous = previousUserId.current;
      const isFirstRun = previous === UNSET_USER;
      const hasChanged = !isFirstRun && previous !== userId;
      previousUserId.current = userId;

      if (hasChanged) {
        setDeviceId(null);
        await removeItem(STORAGE_KEYS.DEVICE_ID);

        /**
         * Signing in retires the guest row this install just created.
         *
         * Sitting on the login screen registers this phone as a guest, and
         * signing in registers it again as owned -- the backend keys a device
         * on its push token *and* its ownership, so the two are different rows
         * and the phone appears twice in its own owner's list.
         *
         * Only on the signed-out-to-signed-in transition, and only once auth
         * has settled: signing *out* abandons the owned row, which is the
         * user's real device and must survive. Best effort -- a failure leaves
         * a stale row the admin can delete, which beats blocking the sign-in.
         */
        if (stored !== null && previous === null && userId !== null) {
          try {
            await deviceService.removeDevice(stored);
          } catch (error) {
            logger.warn('Could not retire the guest device row');
          }
        }
      } else if (stored !== null) {
        // A previous launch already registered; reuse that ID rather than
        // creating a second row for the same phone.
        setDeviceId(stored);
      }

      await register();
    };

    settle().catch(error => logger.error('Device registration failed', error));
  }, [register, isPushReady, isAuthReady, userId]);

  /**
   * Held in a ref rather than named as a dependency of the heartbeat effect:
   * `register` is rebuilt whenever the push token changes, and depending on it
   * would tear down and restart the interval each time, resetting the gap
   * between beats.
   */
  const registerRef = useRef(register);
  useEffect(() => {
    registerRef.current = register;
  }, [register]);

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
      /**
       * A changed BSSID is a re-registration, not a heartbeat.
       *
       * Registering is the only thing that moves a device between networks --
       * a heartbeat from an unrecognised MAC means UNKNOWN by design, and a
       * device left on the wrong network cannot be alerted from either one.
       * Waiting for the next launch to fix that is what put the same phone in
       * the list once per band it had been on.
       */
      if (registeredMac.current !== null && registeredMac.current !== wifiMac) {
        logger.info('WiFi changed; re-registering this device');
        await registerRef.current();
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
