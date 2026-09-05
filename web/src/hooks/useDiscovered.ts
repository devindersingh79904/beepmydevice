/**
 * Things seen on the WiFi that have no app installed.
 *
 * Read-only from the browser, and that is not a limitation of this hook but of
 * the platform: a page has no WiFi BSSID and cannot open a socket to a local
 * address, so it can neither scan nor prove which network it is on. The scan
 * runs in the mobile app — the only client actually on the network — and this
 * list is as fresh as the last time someone pressed Scan there.
 *
 * Not in a context: only the dashboard reads it, and a shared cache for one
 * consumer is a cache that only ever has to be invalidated.
 */

import {useCallback, useEffect, useState} from 'react';

import * as deviceService from '@/services/device.service';
import type {ApiError} from '@/types/api';
import type {DiscoveredDevice} from '@/types/models';
import {toDisplayErrors} from '@/utils/api-client';

interface DiscoveredState {
  discovered: DiscoveredDevice[];
  loading: boolean;
  loaded: boolean;
  errors: ApiError[];
  /** Drop one row. It returns if a later scan sees the device again. */
  ignore: (discoveredId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDiscovered(): DiscoveredState {
  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<ApiError[]>([]);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setDiscovered(await deviceService.listDiscovered());
      setErrors([]);
    } catch (error) {
      setErrors(toDisplayErrors(error));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  const ignore = useCallback(async (discoveredId: string): Promise<void> => {
    // Removed locally first so the row goes on the click rather than after a
    // round trip, then reconciled by the refresh below if the server disagreed.
    setDiscovered(current =>
      current.filter(item => item.discovered_id !== discoveredId),
    );
    try {
      await deviceService.ignoreDiscovered(discoveredId);
    } catch (error) {
      setErrors(toDisplayErrors(error));
      setDiscovered(await deviceService.listDiscovered());
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {discovered, loading, loaded, errors, ignore, refresh};
}
