/** Alert history for one device. */

import {useCallback, useEffect, useState} from 'react';

import * as alertService from '@services/alert';
import type {AlertLog} from '@/types/device';
import {getLogger} from '@utils/logger';

const logger = getLogger('use-device-alert-history');

export interface UseDeviceAlertHistoryResult {
  alerts: AlertLog[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * @param deviceId - Device to read history for, or null to hold off loading.
 */
export function useDeviceAlertHistory(
  deviceId: string | null,
): UseDeviceAlertHistoryResult {
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [isLoading, setLoading] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (deviceId === null) {
      return;
    }
    setLoading(true);
    try {
      const {items} = await alertService.getDeviceAlertLogs(deviceId);
      setAlerts(items);
    } catch (error) {
      // History is supporting detail, not the point of the screen: a failure
      // here shows an empty list rather than taking over with a banner.
      logger.error('Could not load alert history', error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return {alerts, isLoading, refresh};
}
