/**
 * One row in the device list.
 *
 * The alert button is disabled unless the device is ONLINE -- OFFLINE devices
 * cannot receive the push and UNKNOWN devices have left the network -- and
 * also for guests, who can receive alerts but never send them.
 *
 * A guest carries two badges, status and "Guest", because the two are
 * independent: a guest is still online or offline like anything else.
 */

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {borderWidth, colors, radius, spacing, typography} from '@styles/theme';
import {canSendAlertTo, formatRelativeTime, getDeviceTypeLabel} from '@utils/helpers';
import type {Device} from '@types/device';

import {BatteryIndicator} from './BatteryIndicator';
import {Button} from './Button';
import {GuestBadge} from './GuestBadge';
import {StatusBadge} from './StatusBadge';

interface DeviceCardProps {
  device: Device;
  onPress: (deviceId: string) => void;
  onSendAlert: (deviceId: string) => void;
}

export function DeviceCard({
  device,
  onPress,
  onSendAlert,
}: DeviceCardProps): React.JSX.Element {
  const canAlert = canSendAlertTo(device);
  const name = device.device_name ?? getDeviceTypeLabel(device.device_type);

  // A greyed control with no reason reads as a bug, so the guest case says why
  // on the button itself rather than leaving it blank and disabled.
  const alertLabel = device.is_guest
    ? 'Alerts disabled for guests'
    : 'Send alert';

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${device.status}`}
        accessibilityHint="Opens device details"
        onPress={() => onPress(device.device_id)}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.badges}>
            <GuestBadge isGuest={device.is_guest} />
            <StatusBadge status={device.status} />
          </View>
        </View>
        <Text style={styles.type}>
          {getDeviceTypeLabel(device.device_type)}
        </Text>
        <View style={styles.battery}>
          <BatteryIndicator batteryLevel={device.battery_level} />
        </View>
        <Text style={styles.lastSeen}>
          {`Last seen ${formatRelativeTime(device.last_heartbeat)}`}
        </Text>
      </Pressable>
      <Button
        label={alertLabel}
        size="card"
        disabled={!canAlert}
        onPress={() => onSendAlert(device.device_id)}
        style={styles.alertButton}
        accessibilityHint={
          canAlert ? 'Makes this device ring' : 'This device cannot be alerted'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: radius.none,
    padding: spacing.s16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s8,
  },
  name: {...typography.cardTitle, color: colors.textPrimary, flexShrink: 1},
  badges: {flexDirection: 'row', alignItems: 'center', gap: spacing.s6},
  type: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.s2,
  },
  battery: {marginTop: spacing.s10},
  lastSeen: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.s4,
  },
  alertButton: {marginTop: spacing.s12},
});
