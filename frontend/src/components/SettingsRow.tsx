/**
 * One row in the settings list.
 *
 * Composes the four things a settings row can carry: a leading icon, a label
 * (with optional sub-label), a trailing count badge or value, and a chevron
 * when the row navigates. A row with `onPress` gets the chevron; one without
 * is a static value row, which is why "Version" reads differently to
 * "Check for updates".
 */

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {borderWidth, colors, sizes, spacing, typography} from '@styles/theme';

import {Icon} from './Icon';
import type {IconName} from './Icon';

interface SettingsRowProps {
  label: string;
  subLabel?: string;
  icon?: IconName;
  /** Accent count chip, e.g. the number of devices. */
  count?: number;
  /** Plain right-aligned value, e.g. "1.0.0". */
  value?: string;
  onPress?: () => void;
  /** Rendered at the trailing edge instead of a chevron -- a Toggle, say. */
  accessory?: React.ReactNode;
}

export function SettingsRow({
  label,
  subLabel,
  icon,
  count,
  value,
  onPress,
  accessory,
}: SettingsRowProps): React.JSX.Element {
  const isTall = subLabel !== undefined;

  return (
    <Pressable
      accessibilityRole={onPress === undefined ? 'text' : 'button'}
      disabled={onPress === undefined}
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        {minHeight: isTall ? sizes.settingsRowTall : sizes.settingsRow},
        pressed && onPress !== undefined ? styles.pressed : null,
      ]}>
      {icon !== undefined ? <Icon name={icon} /> : null}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {subLabel !== undefined ? (
          <Text style={styles.subLabel}>{subLabel}</Text>
        ) : null}
      </View>
      {count !== undefined ? (
        <Text style={styles.count}>{String(count)}</Text>
      ) : null}
      {value !== undefined ? <Text style={styles.value}>{value}</Text> : null}
      {accessory ?? null}
      {onPress !== undefined && accessory === undefined ? (
        <Icon
          name="chevron-right"
          size={sizes.iconSm}
          color={colors.textDisabled}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s12,
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s10,
    backgroundColor: colors.background,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.border,
  },
  pressed: {backgroundColor: colors.neutral100},
  text: {flex: 1},
  label: {...typography.bodyLarge, color: colors.textPrimary},
  subLabel: {...typography.caption, color: colors.textSecondary},
  count: {
    ...typography.badge,
    color: colors.textInverse,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.s2,
    overflow: 'hidden',
  },
  value: {...typography.body, color: colors.textSecondary},
});
