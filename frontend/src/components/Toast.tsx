/**
 * Transient confirmation at the bottom of the screen.
 *
 * Used for outcomes that need acknowledging but not acting on -- "Device alert
 * sent!", "Device is offline". Anything the user must respond to is a banner
 * or a dialog, not a toast.
 */

import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text} from 'react-native';

import {colors, sizes, spacing, typography} from '@styles/theme';
import {BANNER_ANIMATION_MS, TOAST_DURATION_MS} from '@utils/constants';
import type {ToastMessage, ToastTone} from '@types/ui';

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

const TONE_ICONS: Record<ToastTone, string> = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
};

const TONE_COLORS: Record<ToastTone, string> = {
  success: colors.successIcon,
  error: colors.successIcon,
  info: colors.infoIcon,
};

const SLIDE_FROM = 1;

export function Toast({toast, onDismiss}: ToastProps): React.JSX.Element | null {
  const slide = useRef(new Animated.Value(SLIDE_FROM)).current;
  const toastId = toast?.id ?? null;

  useEffect(() => {
    if (toastId === null) {
      return;
    }

    slide.setValue(SLIDE_FROM);
    Animated.timing(slide, {
      toValue: 0,
      duration: BANNER_ANIMATION_MS,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [onDismiss, slide, toastId]);

  if (toast === null) {
    return null;
  }

  const translateY = slide.interpolate({
    inputRange: [0, SLIDE_FROM],
    outputRange: [0, sizes.toastBottom],
  });

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[styles.toast, {transform: [{translateY}]}]}>
      <Text style={[styles.icon, {color: TONE_COLORS[toast.tone]}]}>
        {TONE_ICONS[toast.tone]}
      </Text>
      <Text style={styles.text}>{toast.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: sizes.toastBottom,
    left: spacing.s16,
    right: spacing.s16,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s8,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.s14,
    paddingVertical: spacing.s10,
  },
  icon: {...typography.smallStrong},
  text: {...typography.small, color: colors.textInverse, flex: 1},
});
