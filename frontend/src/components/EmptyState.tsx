/**
 * Shown when a list has nothing in it.
 *
 * Left-aligned, not centred: the canvas keeps everything on the same left
 * margin as the content it replaces, so an empty list does not read as a
 * different screen.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, sizes, spacing, typography} from '@styles/theme';

import {Button} from './Button';
import {Icon} from './Icon';
import type {IconName} from './Icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={sizes.iconEmpty} color={colors.textDisabled} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel !== undefined && onAction !== undefined ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.s12,
    padding: spacing.s24,
  },
  title: {...typography.dialogTitle, color: colors.textPrimary},
  message: {...typography.body, color: colors.textSecondary},
});
