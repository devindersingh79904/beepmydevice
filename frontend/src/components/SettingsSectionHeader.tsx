/**
 * Full-bleed grey band that groups settings rows: ACCOUNT, DEVICES, ABOUT.
 *
 * Distinct from `SectionLabel`, which labels a block *inside* a padded screen;
 * this one is a band across a list.
 */

import React from 'react';
import {StyleSheet, Text} from 'react-native';

import {colors, spacing, typography} from '@styles/theme';

interface SettingsSectionHeaderProps {
  children: string;
}

export function SettingsSectionHeader({
  children,
}: SettingsSectionHeaderProps): React.JSX.Element {
  return <Text style={styles.header}>{children}</Text>;
}

const styles = StyleSheet.create({
  header: {
    ...typography.sectionLabel,
    color: colors.textSecondary,
    backgroundColor: colors.neutral200,
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s10,
  },
});
