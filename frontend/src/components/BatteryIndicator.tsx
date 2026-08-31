/** Battery level with a threshold-based colour. Renders nothing when null. */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {sizes, spacing, typography} from '@styles/theme';
import {getBatteryColor} from '@utils/helpers';

import {Icon} from './Icon';

interface BatteryIndicatorProps {
  batteryLevel: number | null;
}

export function BatteryIndicator({
  batteryLevel,
}: BatteryIndicatorProps): React.JSX.Element | null {
  if (batteryLevel === null) {
    return null;
  }

  const color = getBatteryColor(batteryLevel);

  return (
    <View style={styles.row}>
      <Icon name="battery" size={sizes.iconXs} color={color} />
      <Text style={[styles.label, {color}]}>{`Battery: ${batteryLevel}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
  },
  label: {...typography.body},
});
