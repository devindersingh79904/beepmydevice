/**
 * One row in the device list.
 *
 * The alert button is disabled unless the device is ONLINE -- OFFLINE devices
 * cannot receive the push and UNKNOWN devices have left the network.
 */

import React from 'react';

import type {Device} from '@types/device';

interface DeviceCardProps {
  device: Device;
  onPress: (deviceId: string) => void;
  onSendAlert: (deviceId: string) => void;
}

export function DeviceCard({
  device,
  onPress,
  onSendAlert,
}: DeviceCardProps): React.JSX.Element {
  throw new Error('Not implemented');
}
