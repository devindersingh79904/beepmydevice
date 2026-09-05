/** Tests for the app shell: navigation, device session hooks and toasts. */

import React from 'react';
import {act, render, renderHook, screen, waitFor} from '@testing-library/react-native';

import {useDeviceRegistration} from '../src/hooks/useDeviceRegistration';
import {usePushNotifications} from '../src/hooks/usePushNotifications';
import {useToast} from '../src/hooks/useToast';
import {RootNavigator} from '../src/navigation/RootNavigator';
import {HEARTBEAT_INTERVAL_MS, STORAGE_KEYS} from '../src/utils/constants';

jest.mock('../src/services/auth');
jest.mock('../src/services/device');
jest.mock('../src/services/alert');
jest.mock('../src/services/websocket');
jest.mock('../src/services/notification');

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: {children: React.ReactNode}) => children,
  useNavigation: () => ({navigate: jest.fn(), goBack: jest.fn()}),
  useRoute: () => ({params: {}}),
}));

// The two stacks are stubbed: RootNavigator's job is choosing between them,
// and rendering the real screens would drag in every provider they read.
jest.mock('../src/navigation/AuthNavigator', () => {
  const {Text} = require('react-native');
  const ReactModule = require('react');
  return {
    AuthNavigator: () => ReactModule.createElement(Text, null, 'AUTH STACK'),
  };
});

jest.mock('../src/navigation/AppNavigator', () => {
  const {Text} = require('react-native');
  const ReactModule = require('react');
  return {
    AppNavigator: () => ReactModule.createElement(Text, null, 'APP STACK'),
  };
});

const authService = require('../src/services/auth') as jest.Mocked<
  typeof import('../src/services/auth')
>;
const deviceService = require('../src/services/device') as jest.Mocked<
  typeof import('../src/services/device')
>;
const notificationService = require('../src/services/notification') as jest.Mocked<
  typeof import('../src/services/notification')
>;
const websocketService = require('../src/services/websocket') as jest.Mocked<
  typeof import('../src/services/websocket')
>;

jest.mock('../src/hooks/useAuth');
const useAuthMock = require('../src/hooks/useAuth') as {useAuth: jest.Mock};

beforeEach(() => {
  jest.clearAllMocks();
  authService.getStoredToken.mockResolvedValue(null);
  authService.getStoredUser.mockResolvedValue(null);
  deviceService.getWifiMacAddress.mockResolvedValue('00:1A:2B:3C:4D:5E');
  deviceService.getWifiNetworkName.mockResolvedValue('Home-WiFi');
  deviceService.getBatteryLevel.mockResolvedValue(80);
  deviceService.registerDevice.mockResolvedValue('device-1');
  deviceService.detectDeviceType.mockReturnValue('android');
  deviceService.sendHeartbeat.mockResolvedValue(undefined);
  notificationService.requestPermissionAndGetToken.mockResolvedValue('push-token');
  notificationService.onTokenRefresh.mockReturnValue(jest.fn());
  websocketService.onStatusUpdate.mockReturnValue(jest.fn());
  websocketService.onConnectionChange.mockReturnValue(jest.fn());
});

describe('useToast', () => {
  it('shows one toast at a time and dismisses it', () => {
    const {result} = renderHook(() => useToast());

    act(() => result.current.showToast('success', 'Device alert sent!'));
    expect(result.current.toast?.text).toBe('Device alert sent!');

    // A second toast replaces the first rather than stacking over the content
    // it is commenting on.
    act(() => result.current.showToast('info', 'Device is offline'));
    expect(result.current.toast?.text).toBe('Device is offline');

    act(() => result.current.dismissToast());
    expect(result.current.toast).toBeNull();
  });
});

describe('usePushNotifications', () => {
  it('requests permission on mount and reports the token', async () => {
    const {result} = renderHook(() => usePushNotifications());

    await waitFor(() => expect(result.current.pushToken).toBe('push-token'));
    expect(result.current.hasPermission).toBe(true);
    expect(notificationService.startListening).toHaveBeenCalled();
  });

  it('reports no permission when the user declines', async () => {
    notificationService.requestPermissionAndGetToken.mockResolvedValue(null);

    const {result} = renderHook(() => usePushNotifications());

    await waitFor(() => expect(result.current.isRequesting).toBe(false));
    expect(result.current.hasPermission).toBe(false);
    // Listening never starts: there is no token for an alert to arrive on.
    expect(notificationService.startListening).not.toHaveBeenCalled();
  });
});

describe('useDeviceRegistration', () => {
  it('registers this device and starts heartbeating', async () => {
    jest.useFakeTimers();

    const {result} = renderHook(() => useDeviceRegistration('push-token', true, 'user-1'));

    await waitFor(() => expect(result.current.deviceId).toBe('device-1'));
    expect(deviceService.registerDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        device_type: 'android',
        wifi_mac: '00:1A:2B:3C:4D:5E',
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    });
    expect(deviceService.sendHeartbeat).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('asks for location permission when the BSSID cannot be read', async () => {
    deviceService.getWifiMacAddress.mockResolvedValue(null);

    const {result} = renderHook(() => useDeviceRegistration('push-token', true, 'user-1'));

    await waitFor(() =>
      expect(result.current.needsLocationPermission).toBe(true),
    );
    // Without a BSSID there is no alert group to join, so registration must
    // not be attempted with a guessed value.
    expect(deviceService.registerDevice).not.toHaveBeenCalled();
  });

  it('does not register until the push token has settled', async () => {
    // Registering with an empty token and again with the real one is what
    // left two rows for one phone, the first of which no alert could reach.
    const {rerender} = renderHook(
      ({ready}: {ready: boolean}) =>
        useDeviceRegistration('push-token', ready, 'user-1'),
      {initialProps: {ready: false}},
    );

    await waitFor(() =>
      expect(deviceService.registerDevice).not.toHaveBeenCalled(),
    );

    rerender({ready: true});
    await waitFor(() => expect(deviceService.registerDevice).toHaveBeenCalled());
    expect(deviceService.registerDevice).toHaveBeenCalledTimes(1);
  });

  it('registers again when a different account signs in', async () => {
    // The row created for the previous account is not this user's, so the
    // dashboard would show them no device at all.
    const {rerender} = renderHook(
      ({uid}: {uid: string | null}) =>
        useDeviceRegistration('push-token', true, uid),
      {initialProps: {uid: null as string | null}},
    );

    await waitFor(() => expect(deviceService.registerDevice).toHaveBeenCalled());
    expect(deviceService.registerDevice).toHaveBeenCalledTimes(1);

    rerender({uid: 'user-1'});
    await waitFor(() =>
      expect(deviceService.registerDevice).toHaveBeenCalledTimes(2),
    );
  });

  it('retires the guest row when the user signs in', async () => {
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(
      STORAGE_KEYS.DEVICE_ID,
      JSON.stringify('guest-row'),
    );

    const {rerender} = renderHook(
      ({uid}: {uid: string | null}) =>
        useDeviceRegistration('push-token', true, uid),
      {initialProps: {uid: null as string | null}},
    );
    await waitFor(() => expect(deviceService.registerDevice).toHaveBeenCalled());

    rerender({uid: 'user-1'});
    // Otherwise the phone shows up twice in its own owner's list: once as the
    // guest it registered as, once as the device it became.
    await waitFor(() =>
      expect(deviceService.removeDevice).toHaveBeenCalledWith('guest-row'),
    );
  });

  it('keeps the owned row when the user signs out', async () => {
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(
      STORAGE_KEYS.DEVICE_ID,
      JSON.stringify('owned-row'),
    );

    const {rerender} = renderHook(
      ({uid}: {uid: string | null}) =>
        useDeviceRegistration('push-token', true, uid),
      {initialProps: {uid: 'user-1' as string | null},
    });
    await waitFor(() => expect(deviceService.registerDevice).toHaveBeenCalled());

    rerender({uid: null});
    await waitFor(() => expect(deviceService.registerDevice).toHaveBeenCalled());
    // Signing out must never delete the user's real device.
    expect(deviceService.removeDevice).not.toHaveBeenCalled();
  });

  it('reuses the device ID a previous launch stored', async () => {
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, JSON.stringify('old-id'));

    const {result} = renderHook(() => useDeviceRegistration(null, true, 'user-1'));

    await waitFor(() => expect(result.current.deviceId).toBeTruthy());
  });
});

describe('RootNavigator', () => {
  it('shows the splash while the session is being restored', () => {
    useAuthMock.useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    render(<RootNavigator />);

    expect(screen.getByText('BeepMyDevice')).toBeTruthy();
  });

  it('shows the auth stack when signed out', () => {
    useAuthMock.useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
    });

    render(<RootNavigator />);

    expect(screen.getByText('AUTH STACK')).toBeTruthy();
  });

  it('shows the app stack when signed in', () => {
    useAuthMock.useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {user_id: 'u1', email: 'dev@example.com', created_at: ''},
    });

    render(<RootNavigator />);

    // Swapping whole stacks is what stops a logout leaving authenticated
    // screens on the back stack.
    expect(screen.getByText('APP STACK')).toBeTruthy();
    expect(screen.queryByText('AUTH STACK')).toBeNull();
  });
});
