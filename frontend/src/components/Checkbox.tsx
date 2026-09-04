/**
 * Square checkbox from the canvas.
 *
 * Like `Toggle`, this is a custom control rather than a platform one: every
 * corner in this system is square, and both platforms draw a rounded tick box.
 *
 * The two states differ by fill *and* by the mark inside them, never by colour
 * alone — an unchecked box is an outline with nothing in it, a checked box is
 * solid accent with a tick. That distinction survives greyscale, and it is the
 * reason the tick is drawn rather than implied by the fill.
 */

import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {borderWidth, colors, radius, sizes} from '@styles/theme';

import {Icon} from './Icon';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accessibilityLabel: string;
}

export function Checkbox({
  checked,
  onChange,
  accessibilityLabel,
}: CheckboxProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{checked}}
      onPress={() => onChange(!checked)}
      // The box is 20pt, below the 44pt touch minimum, so the hit area is
      // grown outwards instead of the box being drawn bigger than the canvas.
      hitSlop={sizes.checkbox}
      style={styles.box}>
      <View style={checked ? styles.filled : styles.empty}>
        {checked ? (
          <Icon name="check" size={sizes.iconXs} color={colors.background} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {flexShrink: 0},
  empty: {
    width: sizes.checkbox,
    height: sizes.checkbox,
    borderRadius: radius.none,
    borderWidth: borderWidth.rule,
    borderColor: colors.textPrimary,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    width: sizes.checkbox,
    height: sizes.checkbox,
    borderRadius: radius.none,
    borderWidth: borderWidth.rule,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
