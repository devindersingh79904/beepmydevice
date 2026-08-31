/**
 * Square initials tile standing in for a user's picture.
 *
 * Square, not a circle: the system has no corner radius, and a circular avatar
 * is the one shape that always looks borrowed from somewhere else.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, radius, sizes, typography} from '@styles/theme';

interface AvatarProps {
  /** Full name or email; the initials are derived from it. */
  name: string;
  size?: 'default' | 'large';
}

const MAX_INITIALS = 2;

/** "Dev Kim" -> "DK"; "dev@example.com" -> "DE". */
function toInitials(name: string): string {
  const words = name
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, MAX_INITIALS).toUpperCase();
  }
  return words
    .slice(0, MAX_INITIALS)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase();
}

export function Avatar({
  name,
  size = 'default',
}: AvatarProps): React.JSX.Element {
  const dimension = size === 'large' ? sizes.avatarLarge : sizes.avatar;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[styles.tile, {width: dimension, height: dimension}]}>
      <Text style={styles.initials}>{toInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radius.none,
  },
  initials: {...typography.button, color: colors.textInverse},
});
