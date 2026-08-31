/** Tests for the shared component library. */

import React from 'react';
import {Text} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';

import {AlertModal} from '../src/components/AlertModal';
import {Avatar} from '../src/components/Avatar';
import {BatteryIndicator} from '../src/components/BatteryIndicator';
import {Button} from '../src/components/Button';
import {ConfirmDialog} from '../src/components/ConfirmDialog';
import {EmptyState} from '../src/components/EmptyState';
import {GuestBadge} from '../src/components/GuestBadge';
import {LoadingSpinner} from '../src/components/LoadingSpinner';
import {Rule} from '../src/components/Rule';
import {SectionLabel} from '../src/components/SectionLabel';
import {SettingsRow} from '../src/components/SettingsRow';
import {SettingsSectionHeader} from '../src/components/SettingsSectionHeader';
import {SkeletonCard} from '../src/components/SkeletonCard';
import {StatusBadge} from '../src/components/StatusBadge';
import {TextField} from '../src/components/TextField';
import {Toast} from '../src/components/Toast';
import {Toggle} from '../src/components/Toggle';
import type {Device} from '../src/types/device';

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

describe('Button', () => {
  it.each(['primary', 'secondary', 'outlineAccent', 'ghost'] as const)(
    'renders the %s variant and fires onPress',
    variant => {
      const onPress = jest.fn();
      render(<Button label="Tap" variant={variant} onPress={onPress} />);

      fireEvent.press(screen.getByRole('button', {name: 'Tap'}));

      expect(onPress).toHaveBeenCalled();
    },
  );

  it('does not fire while disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Tap" disabled onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', {name: 'Tap'}));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire while loading', () => {
    const onPress = jest.fn();
    render(<Button label="Tap" isLoading onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', {name: 'Tap'}));

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('badges and indicators', () => {
  it.each(['ONLINE', 'OFFLINE', 'UNKNOWN'] as const)(
    'StatusBadge labels %s in text, never colour alone',
    status => {
      render(<StatusBadge status={status} />);

      expect(screen.getByText(status)).toBeTruthy();
    },
  );

  it('GuestBadge renders nothing when the device is owned', () => {
    render(<GuestBadge isGuest={false} />);

    expect(screen.queryByText('GUEST')).toBeNull();
  });

  it('GuestBadge renders for a guest', () => {
    render(<GuestBadge isGuest />);

    expect(screen.getByText('GUEST')).toBeTruthy();
  });

  it('BatteryIndicator shows a percentage', () => {
    render(<BatteryIndicator batteryLevel={42} />);

    expect(screen.getByText('Battery: 42%')).toBeTruthy();
  });

  it('BatteryIndicator renders nothing for a device with no battery', () => {
    render(<BatteryIndicator batteryLevel={null} />);

    expect(screen.queryByText(/Battery/)).toBeNull();
  });

  it('Avatar derives initials from an email', () => {
    render(<Avatar name="dev@example.com" />);

    expect(screen.getByText('DE')).toBeTruthy();
  });

  it('Avatar derives initials from a full name', () => {
    render(<Avatar name="Dev Kim" size="large" />);

    expect(screen.getByText('DK')).toBeTruthy();
  });
});

describe('layout pieces', () => {
  it('renders Rule, SectionLabel and SettingsSectionHeader', () => {
    render(
      <>
        <Rule />
        <SectionLabel>STATUS</SectionLabel>
        <SettingsSectionHeader>ACCOUNT</SettingsSectionHeader>
      </>,
    );

    expect(screen.getByText('STATUS')).toBeTruthy();
    expect(screen.getByText('ACCOUNT')).toBeTruthy();
  });

  it('SkeletonCard and LoadingSpinner render', () => {
    render(
      <>
        <SkeletonCard />
        <LoadingSpinner message="Loading devices" fullScreen />
      </>,
    );

    expect(screen.getByText('Loading devices')).toBeTruthy();
    expect(screen.getByLabelText('Loading devices')).toBeTruthy();
  });

  it('EmptyState offers its action', () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        icon="smartphone"
        title="No devices found"
        message="Check the network."
        actionLabel="Refresh"
        onAction={onAction}
      />,
    );

    fireEvent.press(screen.getByRole('button', {name: 'Refresh'}));

    expect(onAction).toHaveBeenCalled();
  });
});

describe('SettingsRow', () => {
  it('renders a navigating row with a count', () => {
    const onPress = jest.fn();
    render(
      <SettingsRow label="Manage devices" icon="smartphone" count={3} onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', {name: /Manage devices/}));

    expect(screen.getByText('3')).toBeTruthy();
    expect(onPress).toHaveBeenCalled();
  });

  it('renders a static value row', () => {
    render(<SettingsRow label="Version" value="1.0.0" />);

    expect(screen.getByText('1.0.0')).toBeTruthy();
  });

  it('renders an accessory instead of a chevron', () => {
    render(<SettingsRow label="Sound" accessory={<Text>ON</Text>} />);

    expect(screen.getByText('ON')).toBeTruthy();
  });
});

describe('Toggle', () => {
  it('reports its state and flips on press', () => {
    const onValueChange = jest.fn();
    render(
      <Toggle value={false} onValueChange={onValueChange} accessibilityLabel="Sound" />,
    );

    fireEvent.press(screen.getByLabelText('Sound'));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe('TextField', () => {
  it('shows an error with the ✗ prefix', () => {
    render(
      <TextField
        label="Email"
        value=""
        onChangeText={jest.fn()}
        error="Enter a valid email address"
      />,
    );

    expect(screen.getByText('✗ Enter a valid email address')).toBeTruthy();
  });

  it('shows a hint when there is no error', () => {
    render(
      <TextField
        label="Email"
        value="a@b.com"
        onChangeText={jest.fn()}
        hint="✓ Looks good"
        hintTone="positive"
      />,
    );

    expect(screen.getByText('✓ Looks good')).toBeTruthy();
  });

  it('toggles password visibility', () => {
    render(
      <TextField label="Password" value="secret" onChangeText={jest.fn()} secure />,
    );

    expect(screen.getByText('SHOW')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Show password'));
    expect(screen.getByText('HIDE')).toBeTruthy();
  });
});

describe('Toast', () => {
  it('renders nothing when there is no toast', () => {
    render(<Toast toast={null} onDismiss={jest.fn()} />);

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the message', () => {
    render(
      <Toast
        toast={{id: '1', tone: 'success', text: 'Device alert sent!'}}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText('Device alert sent!')).toBeTruthy();
  });
});

describe('ConfirmDialog', () => {
  it('confirms and cancels', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        visible
        title="Log out?"
        message="You'll stop receiving device alerts."
        confirmLabel="Log out"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    // RN's Modal renders its children twice under the test renderer, and only
    // one copy is wired up, so every match is pressed.
    screen.getAllByRole('button', {name: 'Log out'}).forEach(fireEvent.press);
    screen.getAllByRole('button', {name: 'Cancel'}).forEach(fireEvent.press);

    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('is not dismissable while busy', () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        visible
        isBusy
        title="Send alert?"
        confirmLabel="Sending…"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    // Dismissing mid-send would leave the user unsure whether it went out.
    screen.getAllByLabelText('Dismiss').forEach(fireEvent.press);

    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('AlertModal', () => {
  it('renders nothing without a target', () => {
    render(
      <AlertModal
        device={null}
        visible
        isSending={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByText('Send alert?')).toBeNull();
  });

  it('names the target and its network', () => {
    render(
      <AlertModal
        device={buildDevice()}
        visible
        isSending={false}
        networkName="Home-WiFi"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getAllByText('Send alert?').length).toBeGreaterThan(0);
    // The network line is the visible half of the WiFi trust boundary.
    expect(screen.getAllByText('Home-WiFi ✓').length).toBeGreaterThan(0);
  });

  it('reports a failed attempt and stays open to retry', () => {
    render(
      <AlertModal
        device={buildDevice()}
        visible
        isSending={false}
        errorMessage="Failed to reach device. Try again."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(
      screen.getAllByText('✗ Failed to reach device. Try again.').length,
    ).toBeGreaterThan(0);
  });
});
