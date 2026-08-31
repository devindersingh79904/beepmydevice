/** Tests for the device and notification services. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {NetworkInfo} from 'react-native-network-info';

import {API_ROUTES, STORAGE_KEYS} from '../src/utils/constants';

jest.mock('../src/services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  remove: jest.fn(),
  getPaginated: jest.fn(),
}));

const api = require('../src/services/api') as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  remove: jest.Mock;
  getPaginated: jest.Mock;
};
const deviceService = require('../src/services/device') as typeof import('../src/services/device');
const notificationService =
  require('../src/services/notification') as typeof import('../src/services/notification');

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('device service', () => {
  it('registers an owned device and stores its ID', async () => {
    api.post.mockResolvedValue({
      device_id: 'device-1',
      is_guest: false,
      device_token: null,
    });

    const deviceId = await deviceService.registerDevice({
      device_name: 'Pixel 8',
      device_type: 'android',
      push_token: 'push-token',
      wifi_mac: '00:1A:2B:3C:4D:5E',
    });

    expect(deviceId).toBe('device-1');
    expect(api.post).toHaveBeenCalledWith(
      API_ROUTES.DEVICE_REGISTER,
      expect.objectContaining({device_name: 'Pixel 8'}),
    );
    await expect(AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID)).resolves.toContain(
      'device-1',
    );
  });

  it('stores the device token a guest registration returns', async () => {
    api.post.mockResolvedValue({
      device_id: 'device-2',
      is_guest: true,
      device_token: 'device-jwt',
    });

    await deviceService.registerDevice({
      device_name: 'Visitor',
      device_type: 'ios',
      push_token: 'push-token',
      wifi_mac: '00:1A:2B:3C:4D:5E',
    });

    // It is the only credential a guest ever holds; without it the device
    // cannot even heartbeat.
    await expect(AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).resolves.toContain(
      'device-jwt',
    );
  });

  it('routes list, detail, heartbeat and removal to their routes', async () => {
    api.getPaginated.mockResolvedValue({items: [], pagination: {}});
    api.get.mockResolvedValue({device_id: 'device-1'});
    api.put.mockResolvedValue({});
    api.remove.mockResolvedValue(undefined);

    await deviceService.listDevices({page: 1});
    await deviceService.getDevice('device-1');
    await deviceService.sendHeartbeat('device-1', {
      battery_level: 80,
      wifi_mac: '00:1A:2B:3C:4D:5E',
    });
    await deviceService.removeDevice('device-1');

    expect(api.getPaginated).toHaveBeenCalledWith(API_ROUTES.DEVICE_LIST, {page: 1});
    expect(api.get).toHaveBeenCalledWith(API_ROUTES.DEVICE_DETAIL('device-1'));
    expect(api.put).toHaveBeenCalledWith(
      API_ROUTES.DEVICE_HEARTBEAT('device-1'),
      expect.objectContaining({battery_level: 80}),
    );
    expect(api.remove).toHaveBeenCalledWith(API_ROUTES.DEVICE_DETAIL('device-1'));
  });

  it('detects the platform it is running on', () => {
    Platform.OS = 'ios';
    expect(deviceService.detectDeviceType()).toBe('ios');

    Platform.OS = 'android';
    expect(deviceService.detectDeviceType()).toBe('android');
  });

  it('reads the SSID for display', async () => {
    Platform.OS = 'ios';
    jest.spyOn(NetworkInfo, 'getSSID').mockResolvedValue('Home-WiFi');

    await expect(deviceService.getWifiNetworkName()).resolves.toBe('Home-WiFi');
  });

  it('returns null when the SSID is unavailable', async () => {
    Platform.OS = 'ios';
    jest.spyOn(NetworkInfo, 'getSSID').mockResolvedValue(null);

    await expect(deviceService.getWifiNetworkName()).resolves.toBeNull();
  });
});

describe('notification service', () => {
  it('returns a push token once permission is granted', async () => {
    await expect(
      notificationService.requestPermissionAndGetToken(),
    ).resolves.toBe('push-token');
  });

  it('returns null when the user declines', async () => {
    messaging().requestPermission.mockResolvedValueOnce(
      messaging.AuthorizationStatus.DENIED,
    );

    // The device stays registered and visible; it simply cannot be reached.
    await expect(
      notificationService.requestPermissionAndGetToken(),
    ).resolves.toBeNull();
  });

  it('starts and stops listening without throwing', () => {
    expect(() => {
      notificationService.startListening();
      notificationService.stopListening();
    }).not.toThrow();
  });

  it('registers a token-refresh callback', () => {
    const unsubscribe = notificationService.onTokenRefresh(jest.fn());

    expect(typeof unsubscribe).toBe('function');
  });
});
