/**
 * The 56pt bar at the top of every signed-in screen.
 *
 * Two shapes, matching the canvas: a back chevron plus a title (detail,
 * settings), or a leading element plus a trailing one (the dashboard's network
 * summary and avatar). The 2pt bottom rule is what separates a *section* from
 * the content below it -- row separators are 1pt.
 */

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {borderWidth, colors, sizes, spacing, typography} from '@styles/theme';

import {Icon} from './Icon';

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  /** Rendered instead of the title, for the dashboard's network summary. */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function ScreenHeader({
  title,
  onBack,
  leading,
  trailing,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      {onBack !== undefined ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.back}>
          <Icon name="chevron-left" size={sizes.iconMd} />
        </Pressable>
      ) : null}
      {leading ?? null}
      {title !== undefined ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.spacer} />
      {trailing ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: sizes.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s12,
    paddingHorizontal: spacing.s16,
    backgroundColor: colors.background,
    borderBottomWidth: borderWidth.rule,
    borderBottomColor: colors.divider,
  },
  back: {paddingVertical: spacing.s8, paddingRight: spacing.s8},
  title: {...typography.screenTitle, color: colors.textPrimary},
  spacer: {flex: 1},
});
