/** Centred activity indicator with an optional label. */

import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {colors, spacing, typography} from '@styles/theme';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  message,
  fullScreen = false,
}: LoadingSpinnerProps): React.JSX.Element {
  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : null]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message !== undefined ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s12,
    padding: spacing.s24,
  },
  fullScreen: {flex: 1, backgroundColor: colors.background},
  message: {...typography.body, color: colors.textSecondary},
});
