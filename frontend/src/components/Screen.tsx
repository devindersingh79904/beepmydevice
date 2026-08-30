/**
 * Screen shell: safe-area insets plus the app background.
 *
 * The canvas fakes the status bar with a 54pt top pad; on device that is the
 * safe-area inset, so it is taken from `SafeAreaProvider` rather than
 * hard-coded, and notched and flat phones both come out right.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {Edge} from 'react-native-safe-area-context';

import {colors} from '@styles/theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Defaults to top and bottom; a screen with its own footer bar passes ['top']. */
  edges?: readonly Edge[];
  /** Full-bleed accent background, for the splash. */
  accent?: boolean;
}

const DEFAULT_EDGES: readonly Edge[] = ['top', 'bottom'];

export function Screen({
  children,
  edges = DEFAULT_EDGES,
  accent = false,
}: ScreenProps): React.JSX.Element {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.screen, accent ? styles.accent : null]}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  accent: {backgroundColor: colors.primary},
  content: {flex: 1},
});
