/**
 * Splash screen.
 *
 * Shown while the persisted session is restored, so the app never flashes the
 * login screen at a user who is already signed in.
 */

import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {Logo, Screen} from '@components/index';
import {colors, spacing, typography} from '@styles/theme';

export function SplashScreen(): React.JSX.Element {
  return (
    <Screen accent>
      <View style={styles.container}>
        <Logo variant="splash" />
        <Text style={styles.title}>BeepMyDevice</Text>
        <Text style={styles.tagline}>Find any device on your WiFi</Text>
        <ActivityIndicator
          size="small"
          color={colors.textInverse}
          style={styles.spinner}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.s20,
    padding: spacing.s32,
  },
  title: {...typography.displayTitle, color: colors.textInverse},
  tagline: {...typography.body, color: colors.accent200},
  spinner: {marginTop: spacing.s12},
});
