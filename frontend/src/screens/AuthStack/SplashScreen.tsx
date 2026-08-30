/**
 * Splash screen.
 *
 * Shown while the persisted session is restored, so the app never flashes the
 * login screen at a user who is already signed in.
 */

import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {Icon, Screen} from '@components/index';
import {colors, radius, sizes, spacing, typography} from '@styles/theme';

export function SplashScreen(): React.JSX.Element {
  return (
    <Screen accent>
      <View style={styles.container}>
        <View style={styles.logo}>
          <Icon
            name="wifi"
            size={sizes.splashLogoIcon}
            color={colors.primary}
          />
        </View>
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
  logo: {
    width: sizes.splashLogo,
    height: sizes.splashLogo,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.none,
  },
  title: {...typography.displayTitle, color: colors.textInverse},
  tagline: {...typography.body, color: colors.accent200},
  spinner: {marginTop: spacing.s12},
});
