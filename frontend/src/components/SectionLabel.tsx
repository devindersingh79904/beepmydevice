/** All-caps label above a block of detail: STATUS, BATTERY. */

import React from 'react';
import {StyleSheet, Text} from 'react-native';

import {colors, spacing, typography} from '@styles/theme';

interface SectionLabelProps {
  children: string;
}

export function SectionLabel({children}: SectionLabelProps): React.JSX.Element {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...typography.sectionLabel,
    color: colors.textSecondary,
    marginBottom: spacing.s8,
  },
});
