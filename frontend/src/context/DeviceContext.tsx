/**
 * Device provider.
 *
 * Owns the device list and applies WebSocket status updates, so every screen
 * reads one shared, always-current list instead of fetching its own.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  AlertDeliveryStatus,
  Device,
  DeviceStatusUpdate,
} from '@/types/device';
import {isApiErrorArray} from '@services/api';
import * as alertService from '@services/alert';
import * as deviceService from '@services/device';
import * as websocketService from '@services/websocket';
import {DEFAULT_PAGE_SIZE, FIRST_PAGE} from '@utils/constants';
import {getLogger} from '@utils/logger';

import {AuthContext} from './AuthContext';
import {ErrorContext} from './ErrorContext';

const logger = getLogger('device-context');

export interface DeviceContextValue {
  devices: Device[];
  /** SSID of the current network, for the dashboard header. */
  networkName: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  /** True while an alert is on the wire. */
  isSending: boolean;
  lastDelivery: AlertDeliveryStatus[];
  sendAlert: (deviceIds: string[]) => Promise<boolean>;
}

export const DeviceContext = createContext<DeviceContextValue | undefined>(
  undefined,
);

interface DeviceProviderProps {
  children: ReactNode;
}

export function DeviceProvider({
  children,
}: DeviceProviderProps): React.JSX.Element {
  const auth = useContext(AuthContext);
  const errorContext = useContext(ErrorContext);

  const [devices, setDevices] = useState<Device[]>([]);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(FIRST_PAGE);
  const [hasMore, setHasMore] = useState(false);
  const [isSending, setSending] = useState(false);
  const [lastDelivery, setLastDelivery] = useState<AlertDeliveryStatus[]>([]);

  const isAuthenticated = auth?.isAuthenticated ?? false;

  /** Route an ApiError[] to the banner; rethrow anything else. */
  const report = useCallback(
    (error: unknown): void => {
      if (isApiErrorArray(error)) {
        errorContext?.showErrors(error);
        return;
      }
      throw error;
    },
    [errorContext],
  );

  const load = useCallback(
    async (targetPage: number, replace: boolean): Promise<void> => {
      try {
        const {items, pagination} = await deviceService.listDevices({
          page: targetPage,
          limit: DEFAULT_PAGE_SIZE,
        });
        setDevices(current => (replace ? items : [...current, ...items]));
        setHasMore(pagination.has_next);
        setPage(pagination.current_page);
      } catch (error) {
        report(error);
      }
    },
    [report],
  );

  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await load(FIRST_PAGE, true);
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || isLoading || isRefreshing) {
      return;
    }
    await load(page + 1, false);
  }, [hasMore, isLoading, isRefreshing, load, page]);

  // First load, plus the network name for the header.
  useEffect(() => {
    if (!isAuthenticated) {
      setDevices([]);
      return;
    }
    const loadFirstPage = async (): Promise<void> => {
      setLoading(true);
      setNetworkName(await deviceService.getWifiNetworkName());
      await load(FIRST_PAGE, true);
      setLoading(false);
    };
    loadFirstPage().catch(error => {
      logger.error('Could not load devices', error);
      setLoading(false);
    });
  }, [isAuthenticated, load]);

  // Live updates. Applied in place rather than refetching, so a status change
  // does not cost a round trip per heartbeat per device.
  useEffect(() => {
    const token = auth?.token ?? null;
    if (!isAuthenticated || token === null) {
      return;
    }

    websocketService.connect(token);
    const unsubscribe = websocketService.onStatusUpdate(
      (update: DeviceStatusUpdate) => {
        setDevices(current =>
          current.map(device =>
            device.device_id === update.device_id
              ? {
                  ...device,
                  // A frame carries only what changed; null means "unchanged"
                  // rather than "cleared".
                  status: update.status ?? device.status,
                  battery_level: update.battery ?? device.battery_level,
                  last_heartbeat: update.timestamp,
                }
              : device,
          ),
        );
      },
    );

    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, [auth?.token, isAuthenticated]);

  const removeDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      try {
        await deviceService.removeDevice(deviceId);
        setDevices(current =>
          current.filter(device => device.device_id !== deviceId),
        );
      } catch (error) {
        report(error);
      }
    },
    [report],
  );

  const sendAlert = useCallback(
    async (deviceIds: string[]): Promise<boolean> => {
      setSending(true);
      try {
        const result = await alertService.sendAlert({device_ids: deviceIds});
        setLastDelivery(result.delivery_status);
        logger.info(
          `Alert ${result.alert_id} sent to ${deviceIds.length} device(s)`,
        );
        return true;
      } catch (error) {
        report(error);
        return false;
      } finally {
        setSending(false);
      }
    },
    [report],
  );

  const value = useMemo(
    (): DeviceContextValue => ({
      devices,
      networkName,
      isLoading,
      isRefreshing,
      hasMore,
      refresh,
      loadMore,
      removeDevice,
      isSending,
      lastDelivery,
      sendAlert,
    }),
    [
      devices,
      hasMore,
      isLoading,
      isRefreshing,
      isSending,
      lastDelivery,
      loadMore,
      networkName,
      refresh,
      removeDevice,
      sendAlert,
    ],
  );

  return (
    <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
  );
}
