/**
 * Online/offline/unknown indicator.
 *
 * Pairs the colour with a text label so status is never conveyed by colour
 * alone.
 */

import React from 'react';

import type {DeviceStatus} from '@types/device';

interface StatusBadgeProps {
  status: DeviceStatus;
}

export function StatusBadge({status}: StatusBadgeProps): React.JSX.Element {
  throw new Error('Not implemented');
}
