/** The 2pt horizontal rule the canvas uses to separate blocks within a screen. */

import React from 'react';
import {StyleSheet, View} from 'react-native';

import {borderWidth, colors, spacing} from '@styles/theme';

export function Rule(): React.JSX.Element {
  return <View style={styles.rule} />;
}

const styles = StyleSheet.create({
  rule: {
    height: borderWidth.rule,
    backgroundColor: colors.divider,
    marginVertical: spacing.s4,
  },
});
