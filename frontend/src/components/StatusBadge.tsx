/**
 * Online/offline/unknown indicator.
 *
 * Pairs the colour with a text label so status is never conveyed by colour
 * alone.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {borderWidth, radius, spacing, typography} from '@styles/theme';
import {getStatusPalette} from '@utils/helpers';
import type {DeviceStatus} from '@/types/device';

interface StatusBadgeProps {
  status: DeviceStatus;
}

export function StatusBadge({status}: StatusBadgeProps): React.JSX.Element {
  const palette = getStatusPalette(status);

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: palette.background, borderColor: palette.border},
      ]}>
      <Text style={[styles.dot, {color: palette.text}]}>●</Text>
      <Text style={[styles.label, {color: palette.text}]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.s2,
    borderWidth: borderWidth.hairline,
    borderRadius: radius.none,
  },
  dot: {...typography.badge},
  label: {...typography.badge},
});
