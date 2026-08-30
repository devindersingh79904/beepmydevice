/**
 * Error banner.
 *
 * Renders every entry in the errors array, not just the first, and dismisses
 * itself after ERROR_AUTO_CLOSE_MS. The user can close it sooner.
 *
 * Positioned absolutely against its parent, so screens place it as the first
 * child of the content area below the header and it overlays rather than
 * pushing the layout down.
 */

import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, sizes, spacing, typography} from '@styles/theme';
import {BANNER_ANIMATION_MS, ERROR_AUTO_CLOSE_MS} from '@utils/constants';
import type {ApiError} from '@types/api';

import {Icon} from './Icon';

interface ErrorAlertProps {
  errors: ApiError[];
  onDismiss: () => void;
  autoCloseMs?: number;
}

const SLIDE_FROM = -1;

export function ErrorAlert({
  errors,
  onDismiss,
  autoCloseMs,
}: ErrorAlertProps): React.JSX.Element | null {
  const slide = useRef(new Animated.Value(SLIDE_FROM)).current;
  const hasErrors = errors.length > 0;

  useEffect(() => {
    if (!hasErrors) {
      return;
    }

    slide.setValue(SLIDE_FROM);
    Animated.timing(slide, {
      toValue: 0,
      duration: BANNER_ANIMATION_MS,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(onDismiss, autoCloseMs ?? ERROR_AUTO_CLOSE_MS);
    return () => clearTimeout(timeout);
  }, [autoCloseMs, hasErrors, onDismiss, slide]);

  if (!hasErrors) {
    return null;
  }

  const translateY = slide.interpolate({
    inputRange: [SLIDE_FROM, 0],
    outputRange: [-sizes.headerHeight, 0],
  });

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[styles.banner, {transform: [{translateY}]}]}>
      <View style={styles.messages}>
        {errors.map(error => (
          <Text key={`${error.code}:${error.message}`} style={styles.message}>
            {error.message}
          </Text>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss error"
        onPress={onDismiss}
        hitSlop={spacing.s8}>
        <Icon name="x" size={sizes.iconXs} color={colors.textInverse} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s10,
  },
  messages: {flex: 1, gap: spacing.s2},
  message: {...typography.smallStrong, color: colors.textInverse},
});
