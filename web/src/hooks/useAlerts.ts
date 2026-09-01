/**
 * The alert history.
 *
 * Not in a context, unlike the device list: three screens read alerts, but
 * each wants a different slice — the dashboard wants today's count, Activity
 * wants a bounded sample to aggregate, Alerts wants a page at a time. One
 * shared cache would have to satisfy all three and would end up refetching for
 * each anyway.
 */

import {useCallback, useEffect, useState} from 'react';

import * as alertService from '@/services/alert.service';
import type {ApiError, PaginationMeta} from '@/types/api';
import type {AlertLog} from '@/types/models';
import {toDisplayErrors} from '@/utils/api-client';
import {DEFAULT_PAGE_SIZE, FIRST_PAGE} from '@/utils/constants';

interface AlertsState {
  alerts: AlertLog[];
  pagination: PaginationMeta | null;
  loading: boolean;
  loaded: boolean;
  errors: ApiError[];
  page: number;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
}

/**
 * Fetch one page of alerts.
 *
 * @param limit - Rows per page. The Activity screen asks for a large page to
 *   aggregate over; the Alerts table uses the default.
 */
export function useAlerts(limit: number = DEFAULT_PAGE_SIZE): AlertsState {
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [page, setPage] = useState(FIRST_PAGE);

  const load = useCallback(
    async (which: number) => {
      setLoading(true);
      setErrors([]);
      try {
        const result = await alertService.listAlerts(which, limit);
        setAlerts(result.items);
        setPagination(result.pagination);
      } catch (error) {
        // AUTH_* has already ended the session in the interceptor; repeating
        // it here would put a banner on the sign-in screen.
        setErrors(toDisplayErrors(error).filter(item => !item.code.startsWith('AUTH_')));
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [limit],
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const refresh = useCallback(() => load(page), [load, page]);

  return {alerts, pagination, loading, loaded, errors, page, setPage, refresh};
}
