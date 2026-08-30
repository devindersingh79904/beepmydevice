/**
 * Device provider.
 *
 * Owns the device list and applies WebSocket status updates, so every screen
 * reads one shared, always-current list instead of fetching its own.
 */

import React, {createContext, type ReactNode} from 'react';

import type {Device} from '@types/device';

export interface DeviceContextValue {
  devices: Device[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  sendAlert: (deviceIds: string[]) => Promise<void>;
}

export const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

interface DeviceProviderProps {
  children: ReactNode;
}

export function DeviceProvider({children}: DeviceProviderProps): React.JSX.Element {
  throw new Error('Not implemented');
}
