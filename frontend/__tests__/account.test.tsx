/** Tests for the account flows added to close Phase 1. */

import React from 'react';
import {act, fireEvent, render, renderHook, screen, waitFor} from '@testing-library/react-native';

import {AuthProvider} from '../src/context/AuthContext';
import {DeviceProvider} from '../src/context/DeviceContext';
import {ErrorProvider} from '../src/context/ErrorContext';
import {useAlerts} from '../src/hooks/useAlerts';
import {useDeviceAlertHistory} from '../src/hooks/useDeviceAlertHistory';
import {usePreferences} from '../src/hooks/usePreferences';
import {ForgotPasswordScreen} from '../src/screens/AuthStack/ForgotPasswordScreen';
import {NotificationSettingsScreen} from '../src/screens/AppStack/NotificationSettingsScreen';
import {ProfileScreen} from '../src/screens/AppStack/ProfileScreen';
import {SettingsScreen} from '../src/screens/AppStack/SettingsScreen';

jest.mock('../src/services/auth');
jest.mock('../src/services/device');
jest.mock('../src/services/alert');
jest.mock('../src/services/websocket');
jest.mock('../src/services/notification');

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn(), goBack: jest.fn()}),
  useRoute: () => ({params: {deviceId: 'device-1'}}),
}));

const authService = require('../src/services/auth') as jest.Mocked<
  typeof import('../src/services/auth')
>;
const alertService = require('../src/services/alert') as jest.Mocked<
  typeof import('../src/services/alert')
>;
const deviceService = require('../src/services/device') as jest.Mocked<
  typeof import('../src/services/device')
>;
const websocketService = require('../src/services/websocket') as jest.Mocked<
  typeof import('../src/services/websocket')
>;

const ALL_ON = {
  notifications_enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  alert_on_silent: false,
};

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
  authService.getPreferences.mockResolvedValue(ALL_ON);
  authService.updatePreferences.mockResolvedValue(ALL_ON);
  deviceService.getWifiNetworkName.mockResolvedValue('Home-WiFi');
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
  alertService.getDeviceAlertLogs.mockResolvedValue({
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

describe('usePreferences', () => {
  it('loads the stored preferences', async () => {
    authService.getPreferences.mockResolvedValue({
      ...ALL_ON,
      vibration_enabled: false,
    });

    const {result} = renderHook(() => usePreferences());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preferences.vibration_enabled).toBe(false);
  });

  it('sends only the toggle that changed', async () => {
    const {result} = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setPreference('sound_enabled', false);
    });

    // Sending all three would clobber a change made on another device.
    expect(authService.updatePreferences).toHaveBeenCalledWith({
      sound_enabled: false,
    });
  });

  it('reverts the toggle when the server refuses', async () => {
    authService.updatePreferences.mockRejectedValue([
      {code: 'SYS_001', message: 'Server unreachable'},
    ]);
    const {result} = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setPreference('notifications_enabled', false);
    });

    // The switch must not sit in a state the server never accepted.
    expect(result.current.preferences.notifications_enabled).toBe(true);
  });
});

describe('SettingsScreen preferences', () => {
  it('persists a toggle through the service', async () => {
    render(
      <Providers>
        <SettingsScreen />
      </Providers>,
    );
    const toggle = await screen.findByLabelText('Alert vibration');

    await act(async () => {
      fireEvent.press(toggle);
    });

    expect(authService.updatePreferences).toHaveBeenCalledWith({
      vibration_enabled: false,
    });
  });

  it('hides the sound and vibration rows when notifications are off', async () => {
    authService.getPreferences.mockResolvedValue({
      ...ALL_ON,
      notifications_enabled: false,
    });

    render(
      <Providers>
        <SettingsScreen />
      </Providers>,
    );

    await screen.findByText('NOTIFICATIONS');
    await waitFor(() => expect(screen.queryByText('Sound')).toBeNull());
  });
});

describe('useDeviceAlertHistory', () => {
  it('loads history for the device', async () => {
    alertService.getDeviceAlertLogs.mockResolvedValue({
      items: [
        {
          alert_id: 'a1',
          target_devices: ['device-1'],
          status: 'SENT',
          created_at: new Date().toISOString(),
        },
      ],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_count: 1,
        page_size: 20,
        has_next: false,
        has_prev: false,
      },
    });

    const {result} = renderHook(() => useDeviceAlertHistory('device-1'));

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));
    expect(alertService.getDeviceAlertLogs).toHaveBeenCalledWith('device-1');
  });

  it('shows an empty list rather than taking over the screen on failure', async () => {
    alertService.getDeviceAlertLogs.mockRejectedValue([
      {code: 'SYS_001', message: 'Server unreachable'},
    ]);

    const {result} = renderHook(() => useDeviceAlertHistory('device-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.alerts).toEqual([]);
  });

  it('does not load until it has a device', () => {
    renderHook(() => useDeviceAlertHistory(null));

    expect(alertService.getDeviceAlertLogs).not.toHaveBeenCalled();
  });
});

describe('ProfileScreen change password', () => {
  it('submits the current and new password', async () => {
    authService.changePassword.mockResolvedValue(undefined);
    render(
      <Providers>
        <ProfileScreen />
      </Providers>,
    );

    fireEvent.changeText(screen.getByLabelText('Current password'), 'OldPass123');
    fireEvent.changeText(screen.getByLabelText('New password'), 'NewPass1234');
    fireEvent.changeText(
      screen.getByLabelText('Confirm new password'),
      'NewPass1234',
    );
    await act(async () => {
      fireEvent.press(screen.getByRole('button', {name: 'Update password'}));
    });

    expect(authService.changePassword).toHaveBeenCalledWith({
      current_password: 'OldPass123',
      new_password: 'NewPass1234',
    });
  });

  it('keeps submit disabled while the confirmation does not match', async () => {
    render(
      <Providers>
        <ProfileScreen />
      </Providers>,
    );

    fireEvent.changeText(screen.getByLabelText('Current password'), 'OldPass123');
    fireEvent.changeText(screen.getByLabelText('New password'), 'NewPass1234');
    fireEvent.changeText(
      screen.getByLabelText('Confirm new password'),
      'Different999',
    );

    expect(
      screen.getByRole('button', {name: 'Update password'}),
    ).toBeDisabled();
  });
});

describe('ForgotPasswordScreen', () => {
  it('requests a reset link', async () => {
    authService.forgotPassword.mockResolvedValue(undefined);
    render(
      <Providers>
        <ForgotPasswordScreen />
      </Providers>,
    );

    fireEvent.changeText(screen.getByTestId('forgot-email'), 'dev@example.com');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', {name: 'Send reset link'}));
    });

    expect(authService.forgotPassword).toHaveBeenCalledWith('dev@example.com');
    expect(screen.getByText('Check your email')).toBeTruthy();
  });

  it('reports the same thing when the request fails', async () => {
    authService.forgotPassword.mockRejectedValue([
      {code: 'SYS_001', message: 'Server unreachable'},
    ]);
    render(
      <Providers>
        <ForgotPasswordScreen />
      </Providers>,
    );

    fireEvent.changeText(screen.getByTestId('forgot-email'), 'ghost@example.com');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', {name: 'Send reset link'}));
    });

    // Anything else would leak whether the address has an account.
    expect(screen.getByText('Check your email')).toBeTruthy();
  });

  it('validates the address before asking the server', async () => {
    render(
      <Providers>
        <ForgotPasswordScreen />
      </Providers>,
    );

    fireEvent.changeText(screen.getByTestId('forgot-email'), 'not-an-email');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', {name: 'Send reset link'}));
    });

    expect(screen.getByText('✗ Enter a valid email address')).toBeTruthy();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });
});

describe('sendAlert delivery reporting', () => {
  it('reports failure when no device was reached', async () => {
    // The endpoint answers 200 with success:true even when every push fails,
    // so the request succeeding says nothing about the phone ringing. This is
    // what made the app show "Device alert sent!" over a FAILED delivery.
    alertService.sendAlert.mockResolvedValue({
      alert_id: 'alert-1',
      delivery_status: [
        {
          device_id: 'device-1',
          device_name: 'Phone',
          status: 'FAILED',
          error_code: 'ALERT_004',
        },
      ],
    });

    const {result} = renderHook(() => useAlerts(), {wrapper: Providers});

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendAlert(['device-1']);
    });
    expect(sent).toBe(false);
  });

  it('reports success when at least one device was reached', async () => {
    alertService.sendAlert.mockResolvedValue({
      alert_id: 'alert-2',
      delivery_status: [
        {
          device_id: 'device-1',
          device_name: 'Phone',
          status: 'SENT',
          error_code: null,
        },
        {
          device_id: 'device-2',
          device_name: 'Tablet',
          status: 'FAILED',
          error_code: 'ALERT_004',
        },
      ],
    });

    const {result} = renderHook(() => useAlerts(), {wrapper: Providers});

    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.sendAlert(['device-1', 'device-2']);
    });
    // Matches the server's rule: one failure is not a failed alert.
    expect(sent).toBe(true);
  });
});

describe('NotificationSettingsScreen', () => {
  it('starts from the stored value rather than a guess', async () => {
    authService.getPreferences.mockResolvedValue({
      ...ALL_ON,
      alert_on_silent: true,
    });

    render(
      <Providers>
        <NotificationSettingsScreen />
      </Providers>,
    );

    const box = await screen.findByLabelText('Alert even on silent mode');
    await waitFor(() =>
      expect(box.props.accessibilityState.checked).toBe(true),
    );
  });

  it('saves nothing until the user asks', async () => {
    render(
      <Providers>
        <NotificationSettingsScreen />
      </Providers>,
    );
    const box = await screen.findByLabelText('Alert even on silent mode');

    await act(async () => {
      fireEvent.press(box);
    });

    // The point of the Save button: overriding the ringer is a deliberate
    // choice, so a brushed checkbox must not already have changed it.
    expect(authService.updatePreferences).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });

    expect(authService.updatePreferences).toHaveBeenCalledWith({
      alert_on_silent: true,
    });
  });

  it('does not let a slow load undo an edit made in the meantime', async () => {
    // The stored value arrives after the first render. If it were adopted
    // unconditionally it would silently revert whatever the user just ticked.
    let resolveLoad: (value: typeof ALL_ON) => void = () => undefined;
    authService.getPreferences.mockReturnValue(
      new Promise<typeof ALL_ON>(resolve => {
        resolveLoad = resolve;
      }),
    );

    render(
      <Providers>
        <NotificationSettingsScreen />
      </Providers>,
    );
    const box = await screen.findByLabelText('Alert even on silent mode');

    await act(async () => {
      fireEvent.press(box);
    });
    await act(async () => {
      resolveLoad({...ALL_ON, alert_on_silent: false});
    });

    expect(box.props.accessibilityState.checked).toBe(true);
  });
});
