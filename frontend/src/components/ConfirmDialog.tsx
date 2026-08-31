/**
 * Base modal: scrim, slide-up card, accent top edge, Cancel/Confirm pair.
 *
 * Every confirmation in the app is built from this, so "Send alert?",
 * "Remove guest?" and "Log out?" cannot drift apart. Tapping the scrim cancels,
 * except while a confirm is in flight -- dismissing mid-send would leave the
 * user unsure whether the alert went out.
 */

import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';

import {
  borderWidth,
  colors,
  elevation,
  radius,
  ratios,
  sizes,
  spacing,
  typography,
} from '@styles/theme';

import {Button} from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  /** One-line explanation under the title. */
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra content between the message and the buttons. */
  children?: React.ReactNode;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isBusy = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps): React.JSX.Element {
  // Dismissing mid-send would leave the user unsure whether the action went
  // through, so both the back gesture and the scrim are inert while busy.
  const dismiss = (): void => {
    if (!isBusy) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}>
      <Pressable
        style={styles.scrim}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={dismiss}>
        <Pressable
          style={[styles.dialog, elevation.dialog]}
          onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          {message !== undefined ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}
          {children ?? null}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                label={cancelLabel}
                onPress={onCancel}
                disabled={isBusy}
                variant="secondary"
                size="dialog"
              />
            </View>
            <View style={styles.action}>
              <Button
                label={confirmLabel}
                onPress={onConfirm}
                isLoading={isBusy}
                variant="primary"
                size="dialog"
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrim,
  },
  dialog: {
    width: ratios.dialogWidth,
    maxWidth: sizes.dialogMaxWidth,
    backgroundColor: colors.background,
    borderRadius: radius.none,
    borderTopWidth: borderWidth.accentBar,
    borderTopColor: colors.primary,
    padding: spacing.s20,
  },
  title: {...typography.dialogTitle, color: colors.textPrimary},
  message: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.s8,
  },
  actions: {flexDirection: 'row', gap: spacing.s10, marginTop: spacing.s18},
  action: {flex: 1},
});
