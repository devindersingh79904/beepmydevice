/**
 * The device list, kept live.
 *
 * One fetch, shared by every screen that needs devices, with WebSocket frames
 * applied to the rows already in memory rather than triggering a refetch. Four
 * screens read this list; four independent fetches of it would quadruple the
 * load for no benefit and let them disagree with each other on screen.
 */

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import type {ReactElement, ReactNode} from 'react';

import {useAuth} from '@/contexts/AuthContext';
import {useStatusSocket} from '@/hooks/useStatusSocket';
import * as deviceService from '@/services/device.service';
import type {ApiError} from '@/types/api';
import type {Device, DeviceStatusFrame} from '@/types/models';
import {MAX_PAGE_SIZE} from '@/utils/constants';
import {toDisplayErrors} from '@/utils/api-client';
import {getLogger} from '@/utils/logger';

const logger = getLogger('device-context');

interface DeviceContextValue {
  devices: Device[];
  loading: boolean;
  /** True once a first load has finished, successfully or not. */
  loaded: boolean;
  errors: ApiError[];
  /** True while the status socket is connected. */
  live: boolean;
  refresh: () => Promise<void>;
  remove: (deviceId: string) => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({children}: {children: ReactNode}): ReactElement {
  const {session} = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<ApiError[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    try {
      // A home network is a handful of devices, so the whole list fits in one
      // page and the dashboard can count online devices honestly. If a network
      // ever outgrows one page, this becomes a real paginated read rather than
      // a larger number.
      const page = await deviceService.listDevices(1, MAX_PAGE_SIZE);
      logger.debug('Device list loaded', {
        count: page.items.length,
        total: page.pagination?.total_count ?? page.items.length,
      });
      setDevices(page.items);
    } catch (error) {
      // An AUTH_* failure has already cleared the session in the interceptor;
      // showing its message here too would put an error banner on the sign-in
      // screen the user is about to be sent to.
      const displayed = toDisplayErrors(error);
      setErrors(displayed.filter(item => !item.code.startsWith('AUTH_')));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (session === null) {
      setDevices([]);
      setLoaded(false);
      return;
    }
    void refresh();
  }, [session, refresh]);

  /**
   * Apply one status frame in place.
   *
   * Only the two fields the frame carries are touched. Replacing the row
   * wholesale would blank `last_heartbeat`, `is_guest` and the name, none of
   * which the socket sends.
   *
   * A frame for a device not in the list is ignored rather than inserted: the
   * frame has no name or type, so inserting it would render an empty row. A
   * newly registered device arrives on the next refresh with its full record.
   */
  const applyFrame = useCallback((frame: DeviceStatusFrame) => {
    logger.debug('Status frame', {
      device: frame.device_id,
      status: frame.status,
      battery: frame.battery_level ?? 'unknown',
    });
    setDevices(current =>
      current.map(device =>
        device.device_id === frame.device_id
          ? {...device, status: frame.status, battery_level: frame.battery_level}
          : device,
      ),
    );
  }, []);

  const {live} = useStatusSocket(session !== null, applyFrame);

  const remove = useCallback(async (deviceId: string) => {
    await deviceService.removeDevice(deviceId);
    logger.info('Device removed', {device: deviceId});
    // Drop it locally rather than refetching: the server has confirmed the
    // delete, and a refetch would blank the table for a moment for one row.
    setDevices(current => current.filter(device => device.device_id !== deviceId));
  }, []);

  const value = useMemo<DeviceContextValue>(
    () => ({devices, loading, loaded, errors, live, refresh, remove}),
    [devices, loading, loaded, errors, live, refresh, remove],
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

/** The shared device list. Throws outside the provider. */
export function useDevices(): DeviceContextValue {
  const context = useContext(DeviceContext);
  if (context === null) {
    throw new Error('useDevices must be used inside <DeviceProvider>');
  }
  return context;
}
