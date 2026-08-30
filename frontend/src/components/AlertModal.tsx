/**
 * Alert confirmation dialog.
 *
 * Shows the target and its network before sending, so the sender can see what
 * is about to make noise and in which room. The network line is the visible
 * half of the trust boundary: the alert reaches this device because it shares
 * this WiFi, not because the sender owns it.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, radius, sizes, spacing, typography} from '@styles/theme';
import {getDeviceTypeLabel} from '@utils/helpers';
import type {Device} from '@types/device';

import {ConfirmDialog} from './ConfirmDialog';
import {Icon} from './Icon';

interface AlertModalProps {
  device: Device | null;
  visible: boolean;
  isSending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Network the target is on, shown as confirmation of the shared-WiFi check. */
  networkName?: string;
  /** Failure from the previous attempt; the dialog stays open so it can be retried. */
  errorMessage?: string;
}

export function AlertModal({
  device,
  visible,
  isSending,
  onConfirm,
  onCancel,
  networkName,
  errorMessage,
}: AlertModalProps): React.JSX.Element | null {
  if (device === null) {
    return null;
  }

  const name = device.device_name ?? getDeviceTypeLabel(device.device_type);

  return (
    <ConfirmDialog
      visible={visible}
      title="Send alert?"
      confirmLabel={isSending ? 'Sending…' : 'Send alert'}
      isBusy={isSending}
      onConfirm={onConfirm}
      onCancel={onCancel}>
      <View style={styles.target}>
        <Icon name="smartphone" size={sizes.iconLg} />
        <View style={styles.targetText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.type}>
            {getDeviceTypeLabel(device.device_type)}
          </Text>
          {networkName !== undefined ? (
            <Text style={styles.network}>{`${networkName} ✓`}</Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.note}>
        This device will beep and vibrate at full volume.
      </Text>
      {errorMessage !== undefined ? (
        <Text style={styles.error}>{`✗ ${errorMessage}`}</Text>
      ) : null}
    </ConfirmDialog>
  );
}

const styles = StyleSheet.create({
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s12,
    backgroundColor: colors.neutral200,
    borderRadius: radius.none,
    padding: spacing.s12,
    marginTop: spacing.s14,
  },
  targetText: {flex: 1},
  name: {...typography.listTitle, color: colors.textPrimary},
  type: {...typography.small, color: colors.textSecondary},
  network: {...typography.smallStrong, color: colors.textTertiary},
  note: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.s12,
  },
  error: {
    ...typography.captionStrong,
    color: colors.errorText,
    marginTop: spacing.s10,
  },
});
