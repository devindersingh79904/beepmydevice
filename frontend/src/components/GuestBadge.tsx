/**
 * "Guest" badge shown on devices that auto-registered without an account.
 *
 * Sits alongside StatusBadge rather than replacing it: guest-ness and
 * reachability are independent, so a guest can be online, offline or unknown
 * like any other device, and the card must show both facts.
 */

import React from 'react';
import {StyleSheet, Text} from 'react-native';

import {borderWidth, colors, radius, spacing, typography} from '@styles/theme';

interface GuestBadgeProps {
  /** Renders nothing when false, so callers can pass `device.is_guest` directly. */
  isGuest: boolean;
}

export function GuestBadge({
  isGuest,
}: GuestBadgeProps): React.JSX.Element | null {
  if (!isGuest) {
    return null;
  }

  return <Text style={styles.badge}>GUEST</Text>;
}

const styles = StyleSheet.create({
  badge: {
    ...typography.badge,
    color: colors.guestText,
    backgroundColor: colors.guestBackground,
    borderWidth: borderWidth.hairline,
    borderColor: colors.guestBorder,
    borderRadius: radius.none,
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.s2,
    overflow: 'hidden',
  },
});
