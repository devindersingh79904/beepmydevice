/** Tests for the custom hooks. */

import React from 'react';
import {act, renderHook, waitFor} from '@testing-library/react-native';

import {AuthProvider} from '../src/context/AuthContext';
import {DeviceProvider} from '../src/context/DeviceContext';
import {ErrorProvider} from '../src/context/ErrorContext';
import {useAuth} from '../src/hooks/useAuth';
import {useDevices} from '../src/hooks/useDevices';
import {useErrors} from '../src/hooks/useErrors';
import type {Device, DeviceStatusUpdate} from '../src/types/device';
import {ERROR_AUTO_CLOSE_MS} from '../src/utils/constants';

jest.mock('../src/services/auth');
jest.mock('../src/services/device');
jest.mock('../src/services/alert');
jest.mock('../src/services/websocket');
jest.mock('../src/services/notification');

const authService = require('../src/services/auth') as jest.Mocked<
  typeof import('../src/services/auth')
>;
const deviceService = require('../src/services/device') as jest.Mocked<
  typeof import('../src/services/device')
>;
const websocketService = require('../src/services/websocket') as jest.Mocked<
  typeof import('../src/services/websocket')
>;

function buildDevice(overrides: Partial<Device> = {}): Device {
  return {
    device_id: 'device-1',
    device_name: 'Pixel 8',
    device_type: 'android',
    device_os_version: '14',
    battery_level: 50,
    status: 'OFFLINE',
    last_heartbeat: null,
    created_at: new Date().toISOString(),
    is_guest: false,
    ...overrides,
  };
}

/** Providers in the same order App.tsx mounts them. */
function wrapper({children}: {children: React.ReactNode}): React.JSX.Element {
  return React.createElement(
    ErrorProvider,
    null,
    React.createElement(AuthProvider, null, React.createElement(DeviceProvider, null, children)),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  authService.getStoredToken.mockResolvedValue(null);
  authService.getStoredUser.mockResolvedValue(null);
  deviceService.listDevices.mockResolvedValue({
    items: [],
    pagination: {
      current_page: 1,
      total_pages: 1,
      total_count: 0,
      page_size: 20,
      has_next: false,
      has_prev: false,
    },
  });
  deviceService.getWifiNetworkName.mockResolvedValue('Home-WiFi');
  websocketService.onStatusUpdate.mockReturnValue(jest.fn());
  websocketService.onConnectionChange.mockReturnValue(jest.fn());
});

describe('useAuth', () => {
  it('throws when used outside an AuthProvider', () => {
    // The error is thrown during render; silence React's own console noise.
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used inside an AuthProvider',
    );

    consoleError.mockRestore();
  });

  it('restores a persisted session on mount', async () => {
    authService.getStoredToken.mockResolvedValue('stored-jwt');
    authService.getStoredUser.mockResolvedValue({
      user_id: 'user-1',
      email: 'dev@example.com',
      created_at: new Date().toISOString(),
    });

    const {result} = renderHook(() => useAuth(), {wrapper});

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('dev@example.com');
  });

  it('clears local state on logout even if the network call fails', async () => {
    authService.getStoredToken.mockResolvedValue('stored-jwt');
    authService.getStoredUser.mockResolvedValue({
      user_id: 'user-1',
      email: 'dev@example.com',
      created_at: new Date().toISOString(),
    });
    // The service swallows the network failure itself; the guarantee under
    // test is that local state ends up signed out regardless.
    authService.logout.mockResolvedValue(undefined);

    const {result} = renderHook(() => useAuth(), {wrapper});
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});

describe('useDevices', () => {
  beforeEach(() => {
    authService.getStoredToken.mockResolvedValue('stored-jwt');
    authService.getStoredUser.mockResolvedValue({
      user_id: 'user-1',
      email: 'dev@example.com',
      created_at: new Date().toISOString(),
    });
  });

  it('applies WebSocket status updates without refetching', async () => {
    deviceService.listDevices.mockResolvedValue({
      items: [buildDevice({status: 'OFFLINE'})],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_count: 1,
        page_size: 20,
        has_next: false,
        has_prev: false,
      },
    });
    let emit: ((update: DeviceStatusUpdate) => void) | null = null;
    websocketService.onStatusUpdate.mockImplementation(callback => {
      emit = callback;
      return jest.fn();
    });

    const {result} = renderHook(() => useDevices(), {wrapper});
    await waitFor(() => expect(result.current.devices).toHaveLength(1));
    const callsAfterLoad = deviceService.listDevices.mock.calls.length;

    act(() => {
      emit?.({
        device_id: 'device-1',
        status: 'ONLINE',
        battery: null,
        timestamp: new Date().toISOString(),
      });
    });

    expect(result.current.devices[0].status).toBe('ONLINE');
    // No refetch: the frame is applied in place.
    expect(deviceService.listDevices).toHaveBeenCalledTimes(callsAfterLoad);
  });

  it('applies battery updates in place', async () => {
    deviceService.listDevices.mockResolvedValue({
      items: [buildDevice({battery_level: 50})],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_count: 1,
        page_size: 20,
        has_next: false,
        has_prev: false,
      },
    });
    let emit: ((update: DeviceStatusUpdate) => void) | null = null;
    websocketService.onStatusUpdate.mockImplementation(callback => {
      emit = callback;
      return jest.fn();
    });

    const {result} = renderHook(() => useDevices(), {wrapper});
    await waitFor(() => expect(result.current.devices).toHaveLength(1));

    act(() => {
      emit?.({
        device_id: 'device-1',
        status: null as unknown as Device['status'],
        battery: 12,
        timestamp: new Date().toISOString(),
      });
    });

    expect(result.current.devices[0].battery_level).toBe(12);
    // A frame with no status must not clear the one already known.
    expect(result.current.devices[0].status).toBe('OFFLINE');
  });
});

describe('useErrors', () => {
  it('auto-clears errors after ERROR_AUTO_CLOSE_MS', async () => {
    jest.useFakeTimers();
    const {result} = renderHook(() => useErrors(), {wrapper});

    act(() => {
      result.current.showErrors([{code: 'SYS_001', message: 'Something broke'}]);
    });
    expect(result.current.errors).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(ERROR_AUTO_CLOSE_MS);
    });

    expect(result.current.errors).toHaveLength(0);
    jest.useRealTimers();
  });

  it('maps VAL_ errors onto fieldErrors by field name', () => {
    const {result} = renderHook(() => useErrors(), {wrapper});

    act(() => {
      result.current.showErrors([
        {code: 'VAL_003', message: 'Enter a valid email address', field: 'email'},
        {code: 'SYS_001', message: 'Unrelated banner error'},
      ]);
    });

    expect(result.current.fieldErrors).toEqual({
      email: 'Enter a valid email address',
    });
  });
});
