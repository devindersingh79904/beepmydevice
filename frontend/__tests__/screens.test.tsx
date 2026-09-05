/** Tests for screens and components. */

import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react-native';

import {DeviceCard} from '../src/components/DeviceCard';
import {ErrorAlert} from '../src/components/ErrorAlert';
import {AuthProvider} from '../src/context/AuthContext';
import {DeviceProvider} from '../src/context/DeviceContext';
import {ErrorProvider} from '../src/context/ErrorContext';
import {DashboardScreen} from '../src/screens/AppStack/DashboardScreen';
import {LoginScreen} from '../src/screens/AuthStack/LoginScreen';
import type {Device} from '../src/types/device';
import {ERROR_AUTO_CLOSE_MS} from '../src/utils/constants';

jest.mock('../src/services/auth');
jest.mock('../src/services/device');
jest.mock('../src/services/alert');
jest.mock('../src/services/websocket');
jest.mock('../src/services/notification');

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn(), goBack: jest.fn()}),
  useRoute: () => ({params: {}}),
}));

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
    status: 'ONLINE',
    last_heartbeat: new Date().toISOString(),
    created_at: new Date().toISOString(),
    is_guest: false,
    ...overrides,
  };
}

function Providers({children}: {children: React.ReactNode}): React.JSX.Element {
  return (
    <ErrorProvider>
      <AuthProvider>
        <DeviceProvider>{children}</DeviceProvider>
      </AuthProvider>
    </ErrorProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  authService.getStoredToken.mockResolvedValue('stored-jwt');
  authService.getStoredUser.mockResolvedValue({
    user_id: 'user-1',
    email: 'dev@example.com',
    created_at: new Date().toISOString(),
  });
  deviceService.getWifiNetworkName.mockResolvedValue('Home-WiFi');
  authService.getPreferences.mockResolvedValue({
    notifications_enabled: true,
    sound_enabled: true,
    vibration_enabled: true,
    alert_on_silent: false,
  });
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
  websocketService.onStatusUpdate.mockReturnValue(jest.fn());
  websocketService.onConnectionChange.mockReturnValue(jest.fn());
});

describe('DeviceCard', () => {
  it('keeps the alert button live for an OFFLINE device', () => {
    // A phone that has stopped heartbeating is exactly the one somebody is
    // looking for, and a push still reaches it.
    render(
      <DeviceCard
        device={buildDevice({status: 'OFFLINE'})}
        onPress={jest.fn()}
        onSendAlert={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', {name: 'Send alert'})).toBeEnabled();
  });

  it('disables the alert button for a device on another network', () => {
    render(
      <DeviceCard
        device={buildDevice({status: 'UNKNOWN'})}
        onPress={jest.fn()}
        onSendAlert={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {name: 'Device is on another network'}),
    ).toBeDisabled();
  });

  it('disables the alert button for an UNKNOWN device', () => {
    render(
      <DeviceCard
        device={buildDevice({status: 'UNKNOWN'})}
        onPress={jest.fn()}
        onSendAlert={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {name: 'Device is on another network'}),
    ).toBeDisabled();
  });

  it('hides the battery indicator when battery_level is null', () => {
    render(
      <DeviceCard
        device={buildDevice({battery_level: null})}
        onPress={jest.fn()}
        onSendAlert={jest.fn()}
      />,
    );

    // Renders nothing at all rather than "0%", which would read as a flat
    // battery instead of a device that has none.
    expect(screen.queryByText(/Battery:/)).toBeNull();
  });

  it('opens the device when the card body is pressed', () => {
    const onPress = jest.fn();
    render(
      <DeviceCard
        device={buildDevice()}
        onPress={onPress}
        onSendAlert={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText('Pixel 8, ONLINE'));

    expect(onPress).toHaveBeenCalledWith('device-1');
  });

  it('sends an alert for an ONLINE owned device', () => {
    const onSendAlert = jest.fn();
    render(
      <DeviceCard
        device={buildDevice()}
        onPress={jest.fn()}
        onSendAlert={onSendAlert}
      />,
    );

    fireEvent.press(screen.getByRole('button', {name: 'Send alert'}));

    expect(onSendAlert).toHaveBeenCalledWith('device-1');
  });

  it('badges a guest but still lets the admin alert it', () => {
    // Finding a visitor's phone is what guest registration is for. The badge
    // is the whole of the guest treatment here; the restriction that mentions
    // guests applies to the sender's credential, not to the target.
    const onSendAlert = jest.fn();
    render(
      <DeviceCard
        device={buildDevice({is_guest: true, status: 'ONLINE'})}
        onPress={jest.fn()}
        onSendAlert={onSendAlert}
      />,
    );

    expect(screen.getByText('GUEST')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Send alert'}));

    expect(onSendAlert).toHaveBeenCalledWith('device-1');
  });

  it('refuses to alert a guest that moved to another network', () => {
    render(
      <DeviceCard
        device={buildDevice({is_guest: true, status: 'UNKNOWN'})}
        onPress={jest.fn()}
        onSendAlert={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {name: 'Device is on another network'}),
    ).toBeDisabled();
  });
});

describe('ErrorAlert', () => {
  it('renders every error in the array, not just the first', () => {
    render(
      <ErrorAlert
        errors={[
          {code: 'VAL_003', message: 'Enter a valid email address'},
          {code: 'VAL_004', message: 'Password is too weak'},
        ]}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    expect(screen.getByText('Password is too weak')).toBeTruthy();
  });

  it('dismisses itself after the auto-close delay', () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    render(
      <ErrorAlert
        errors={[{code: 'SYS_001', message: 'Something broke'}]}
        onDismiss={onDismiss}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(ERROR_AUTO_CLOSE_MS);
    });

    expect(onDismiss).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('can be dismissed manually before the delay elapses', () => {
    const onDismiss = jest.fn();
    render(
      <ErrorAlert
        errors={[{code: 'SYS_001', message: 'Something broke'}]}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(screen.getByLabelText('Dismiss error'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('LoginScreen', () => {
  it('shows VAL_ errors inline on their fields', async () => {
    render(
      <Providers>
        <LoginScreen />
      </Providers>,
    );

    // Submitting an invalid email raises the field error inline, not a banner.
    fireEvent.changeText(screen.getByTestId('login-email'), 'not-an-email');
    fireEvent.changeText(screen.getByTestId('login-password'), 'secret123');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', {name: 'Sign in'}));
    });

    expect(screen.getByText('✗ Enter a valid email address')).toBeTruthy();
  });

  it('shows non-validation errors in the banner', async () => {
    render(
      <Providers>
        <LoginScreen />
      </Providers>,
    );

    // A SYS_/AUTH_ code has no field to attach to, so it belongs in the banner.
    authService.login.mockRejectedValue([
      {code: 'AUTH_001', message: 'Invalid email or password'},
    ]);
    fireEvent.changeText(screen.getByTestId('login-email'), 'dev@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'wrong-password');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', {name: 'Sign in'}));
    });

    expect(await screen.findByText('Invalid email or password')).toBeTruthy();
  });
});

describe('DashboardScreen', () => {
  it('renders a device for every row returned', async () => {
    deviceService.listDevices.mockResolvedValue({
      items: [
        buildDevice({device_id: 'd1', device_name: 'Pixel 8'}),
        buildDevice({device_id: 'd2', device_name: 'MacBook Pro'}),
      ],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_count: 2,
        page_size: 20,
        has_next: false,
        has_prev: false,
      },
    });

    render(
      <Providers>
        <DashboardScreen />
      </Providers>,
    );

    expect(await screen.findByText('Pixel 8')).toBeTruthy();
    expect(screen.getByText('MacBook Pro')).toBeTruthy();
  });

  it('shows the disconnected indicator when the socket drops', async () => {
    let notifyConnection: ((connected: boolean) => void) | null = null;
    websocketService.onConnectionChange.mockImplementation(callback => {
      notifyConnection = callback;
      return jest.fn();
    });

    render(
      <Providers>
        <DashboardScreen />
      </Providers>,
    );
    await act(async () => {
      notifyConnection?.(true);
    });

    await act(async () => {
      notifyConnection?.(false);
    });

    // Reported as a status line, not an error banner: the socket dropping is
    // normal operation for a phone that sleeps or changes network.
    expect(screen.getByText('Reconnecting…')).toBeTruthy();
  });
});
