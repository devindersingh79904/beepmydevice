/**
 * One row in the device list.
 *
 * The alert button is disabled unless the device is ONLINE -- OFFLINE devices
 * cannot receive the push and UNKNOWN devices have left the network -- and
 * also for guests, who can receive alerts but never send them.
 *
 * A guest carries two badges, status and "Guest", because the two are
 * independent: a guest is still online or offline like anything else.
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
