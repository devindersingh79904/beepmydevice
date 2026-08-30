/** Battery level with a threshold-based colour. Renders nothing when null. */

import React from 'react';

interface BatteryIndicatorProps {
  batteryLevel: number | null;
}

export function BatteryIndicator({
  batteryLevel,
}: BatteryIndicatorProps): React.JSX.Element | null {
  throw new Error('Not implemented');
}
