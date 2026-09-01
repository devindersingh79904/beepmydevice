/**
 * Render checks for the screens that have no behaviour of their own.
 *
 * These assert the screen mounts and shows the content the design canvas
 * specifies. Behavioural cases live in screens.test.tsx.
 */

import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';

import {AuthProvider} from '../src/context/AuthContext';
import {DeviceProvider} from '../src/context/DeviceContext';
import {ErrorProvider} from '../src/context/ErrorContext';
import {DashboardScreen} from '../src/screens/AppStack/DashboardScreen';
import {DeviceDetailScreen} from '../src/screens/AppStack/DeviceDetailScreen';
import {ProfileScreen} from '../src/screens/AppStack/ProfileScreen';
import {SettingsScreen} from '../src/screens/AppStack/SettingsScreen';
import {RegisterScreen} from '../src/screens/AuthStack/RegisterScreen';
import {SplashScreen} from '../src/screens/AuthStack/SplashScreen';
import type {Device} from '../src/types/device';

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
    device_os_version: 'Android 14',
    battery_level: 72,
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

function mockList(items: Device[]): void {
  deviceService.listDevices.mockResolvedValue({
    items,
    pagination: {
      current_page: 1,
      total_pages: 1,
      total_count: items.length,
      page_size: 20,
      has_next: false,
      has_prev: false,
    },
  });
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
  });
  mockList([]);
  websocketService.onStatusUpdate.mockReturnValue(jest.fn());
  websocketService.onConnectionChange.mockReturnValue(jest.fn());
});

describe('SplashScreen', () => {
  it('shows the wordmark and tagline', () => {
    render(<SplashScreen />);

    expect(screen.getByText('BeepMyDevice')).toBeTruthy();
    expect(screen.getByText('Find any device on your WiFi')).toBeTruthy();
  });
});

describe('RegisterScreen', () => {
  it('renders the form', () => {
    render(
      <Providers>
        <RegisterScreen />
      </Providers>,
    );

    // "Create account" is both the heading and the button label, so the
    // subtitle is what identifies the screen unambiguously.
    expect(screen.getByText('One account, all your devices')).toBeTruthy();
    expect(screen.getByTestId('register-email')).toBeTruthy();
  });

  it('disables submit until the form is valid', () => {
    render(
      <Providers>
        <RegisterScreen />
      </Providers>,
    );

    expect(screen.getByRole('button', {name: 'Create account'})).toBeDisabled();
  });
});

describe('DashboardScreen', () => {
  it('shows the empty state when the network has no devices', async () => {
    render(
      <Providers>
        <DashboardScreen />
      </Providers>,
    );

    expect(await screen.findByText('No devices found')).toBeTruthy();
  });
});

describe('DeviceDetailScreen', () => {
  it('shows the device and its alert history placeholder', async () => {
    mockList([buildDevice()]);

    render(
      <Providers>
        <DeviceDetailScreen />
      </Providers>,
    );

    expect(await screen.findByText('Alert history')).toBeTruthy();
    expect(screen.getByText('No alerts sent yet')).toBeTruthy();
    expect(screen.getByText('72%')).toBeTruthy();
  });

  it('offers Remove guest, and still offers to alert the guest', async () => {
    mockList([buildDevice({is_guest: true, status: 'ONLINE'})]);

    render(
      <Providers>
        <DeviceDetailScreen />
      </Providers>,
    );

    expect(await screen.findByText('Remove guest')).toBeTruthy();
    // A guest is an ordinary alert target -- beeping a visitor's phone is the
    // reason guest registration exists.
    expect(screen.getByText('Send alert')).toBeTruthy();
    // A guest has no owner, so the owner-only action must not be offered.
    expect(screen.queryByText('Remove device')).toBeNull();
  });

  it('reports a device that has left the network', async () => {
    mockList([]);

    render(
      <Providers>
        <DeviceDetailScreen />
      </Providers>,
    );

    await waitFor(() =>
      expect(
        screen.getByText('This device is no longer on the network.'),
      ).toBeTruthy(),
    );
  });
});

describe('SettingsScreen', () => {
  it('lists the settings sections', async () => {
    render(
      <Providers>
        <SettingsScreen />
      </Providers>,
    );

    expect(await screen.findByText('ACCOUNT')).toBeTruthy();
    expect(screen.getByText('NOTIFICATIONS')).toBeTruthy();
    expect(screen.getByText('Log out')).toBeTruthy();
  });

  it('says so when the network has no guests', async () => {
    render(
      <Providers>
        <SettingsScreen />
      </Providers>,
    );

    expect(
      await screen.findByText('No guest devices on this network'),
    ).toBeTruthy();
  });

  it('lists a guest with a Remove action', async () => {
    mockList([buildDevice({is_guest: true, device_name: 'Visitor'})]);

    render(
      <Providers>
        <SettingsScreen />
      </Providers>,
    );

    expect(await screen.findByText('Visitor')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Remove'})).toBeTruthy();
  });
});

describe('ProfileScreen', () => {
  it('shows the account and the change-password form', async () => {
    render(
      <Providers>
        <ProfileScreen />
      </Providers>,
    );

    expect(await screen.findByText('dev@example.com')).toBeTruthy();
    expect(screen.getByText('CHANGE PASSWORD')).toBeTruthy();
  });
});
