/**
 * The app's button.
 *
 * Four variants, matching the canvas: `primary` (solid accent), `secondary`
 * (hairline outline), `outlineAccent` (accent outline -- destructive-ish
 * actions like "Remove guest" and "Log out") and `ghost` (text only).
 *
 * A disabled button dims rather than disappearing, because the dashboard
 * relies on a greyed "Alerts disabled for guests" reading as an explanation.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';

import {
  borderWidth,
  colors,
  radius,
  sizes,
  spacing,
  typography,
} from '@styles/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outlineAccent' | 'ghost';
export type ButtonSize = 'primary' | 'dialog' | 'card';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  isLoading?: boolean;
  /** Left-aligns the label, as the settings "Log out" row does. */
  alignStart?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const DISABLED_OPACITY = 0.45;

const HEIGHTS: Record<ButtonSize, number> = {
  primary: sizes.buttonPrimary,
  dialog: sizes.buttonDialog,
  card: sizes.buttonCard,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'primary',
  disabled = false,
  isLoading = false,
  alignStart = false,
  style,
  accessibilityHint,
}: ButtonProps): React.JSX.Element {
  const isInert = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: isInert, busy: isLoading}}
      accessibilityHint={accessibilityHint}
      disabled={isInert}
      onPress={onPress}
      style={({pressed}) => [
        styles.base,
        {height: HEIGHTS[size]},
        styles[variant],
        alignStart ? styles.alignStart : styles.alignCenter,
        pressed && !isInert ? styles[`${variant}Pressed`] : null,
        isInert ? styles.disabled : null,
        style,
      ]}>
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.textInverse : colors.primary}
          />
        ) : null}
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    paddingHorizontal: spacing.s16,
    borderRadius: radius.none,
    borderWidth: borderWidth.hairline,
    borderColor: colors.transparent,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s8,
  },
  alignCenter: {alignItems: 'center'},
  alignStart: {alignItems: 'flex-start'},
  disabled: {opacity: DISABLED_OPACITY},
  label: {...typography.button},

  primary: {backgroundColor: colors.primary},
  primaryPressed: {backgroundColor: colors.primaryDarker},
  primaryLabel: {color: colors.textInverse},

  secondary: {borderColor: colors.divider},
  secondaryPressed: {backgroundColor: colors.neutral200},
  secondaryLabel: {color: colors.textPrimary},

  outlineAccent: {borderColor: colors.primary},
  outlineAccentPressed: {backgroundColor: colors.primaryLight},
  outlineAccentLabel: {color: colors.primaryDarker},

  ghost: {paddingHorizontal: spacing.s4},
  ghostPressed: {backgroundColor: colors.primaryLight},
  ghostLabel: {color: colors.primaryDarker},
});
