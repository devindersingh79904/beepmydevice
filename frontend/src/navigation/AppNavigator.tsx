/** Stack shown while signed in: dashboard, device detail, settings, profile. */

import React from 'react';

export type AppStackParamList = {
  Dashboard: undefined;
  DeviceDetail: {deviceId: string};
  Settings: undefined;
  Profile: undefined;
};

export function AppNavigator(): React.JSX.Element {
  throw new Error('Not implemented');
}
