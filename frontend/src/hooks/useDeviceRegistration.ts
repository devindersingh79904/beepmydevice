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
import {getItem} from '@utils/storage';

const logger = getLogger('use-device-registration');

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
 */
export function useDeviceRegistration(
  pushToken: string | null,
): UseDeviceRegistrationResult {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [needsLocationPermission, setNeedsLocationPermission] = useState(false);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const register = useCallback(async (): Promise<void> => {
    const wifiMac = await deviceService.getWifiMacAddress();
    if (wifiMac === null) {
      setNeedsLocationPermission(true);
      return;
    }
    setNeedsLocationPermission(false);

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
    }
  }, [pushToken]);

  useEffect(() => {
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
