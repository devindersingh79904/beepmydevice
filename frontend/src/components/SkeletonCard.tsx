/**
 * Placeholder shown in a device card's place while the list loads.
 *
 * Mirrors the real card's geometry -- title, meta line, action button -- so the
 * list does not reflow when the data arrives.
 */

import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet} from 'react-native';

import {
  borderWidth,
  colors,
  radius,
  ratios,
  sizes,
  spacing,
} from '@styles/theme';

const PULSE_MIN = 0.45;
const PULSE_MAX = 1;
const PULSE_DURATION_MS = 750;

export function SkeletonCard(): React.JSX.Element {
  const pulse = useRef(new Animated.Value(PULSE_MAX)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: PULSE_MIN,
          duration: PULSE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: PULSE_MAX,
          duration: PULSE_DURATION_MS,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading devices"
      style={[styles.card, {opacity: pulse}]}>
      <Animated.View style={[styles.bar, styles.title]} />
      <Animated.View style={[styles.bar, styles.meta]} />
      <Animated.View style={[styles.bar, styles.button]} />
    </Animated.View>
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
  bar: {backgroundColor: colors.skeleton},
  title: {
    height: sizes.skeletonTitle,
    width: ratios.skeletonTitleWidth,
    marginBottom: spacing.s10,
  },
  meta: {
    height: sizes.skeletonMeta,
    width: ratios.skeletonMetaWidth,
    marginBottom: spacing.s14,
  },
  button: {height: sizes.skeletonButton, width: ratios.full},
});
