/**
 * Square switch from the canvas.
 *
 * Not the platform `Switch`: that control is a rounded pill on both platforms,
 * and a rounded control in a system with zero corner radius reads as foreign.
 */

import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet} from 'react-native';

import {colors, radius, sizes} from '@styles/theme';
import {TOGGLE_ANIMATION_MS} from '@utils/constants';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}

export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: ToggleProps): React.JSX.Element {
  const offset = useRef(
    new Animated.Value(value ? sizes.toggleKnobTravel : sizes.toggleKnobInset),
  ).current;

  useEffect(() => {
    Animated.timing(offset, {
      toValue: value ? sizes.toggleKnobTravel : sizes.toggleKnobInset,
      duration: TOGGLE_ANIMATION_MS,
      useNativeDriver: false,
    }).start();
  }, [offset, value]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{checked: value}}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        {backgroundColor: value ? colors.toggleOn : colors.toggleOff},
      ]}>
      <Animated.View style={[styles.knob, {left: offset}]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: sizes.toggleWidth,
    height: sizes.toggleHeight,
    borderRadius: radius.none,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: sizes.toggleKnob,
    height: sizes.toggleKnob,
    borderRadius: radius.none,
    backgroundColor: colors.background,
  },
});
