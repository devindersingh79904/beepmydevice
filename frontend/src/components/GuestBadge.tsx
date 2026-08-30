/**
 * "Guest" badge shown on devices that auto-registered without an account.
 *
 * Sits alongside StatusBadge rather than replacing it: guest-ness and
 * reachability are independent, so a guest can be online, offline or unknown
 * like any other device, and the card must show both facts.
 */

import React from 'react';

interface GuestBadgeProps {
  /** Renders nothing when false, so callers can pass `device.is_guest` directly. */
  isGuest: boolean;
}

export function GuestBadge({isGuest}: GuestBadgeProps): React.JSX.Element | null {
  throw new Error('Not implemented');
}
