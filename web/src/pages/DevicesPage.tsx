/**
 * Device management: filter, sort, alert, remove.
 *
 * Filtering and sorting happen in the browser. The list endpoint takes only
 * `page` and `limit` — no filter or sort parameters exist — and a home network
 * is a handful of devices, so the whole list is already in memory. Inventing
 * query parameters the API does not accept would fail silently: FastAPI ignores
 * unknown query strings, so the server would return an unfiltered page and the
 * UI would look like it worked.
 */

import {useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import {Dialog} from '@/components/Dialog';
import {SendAlertDialog} from '@/components/SendAlertDialog';
import {
  Battery,
  Button,
  DeviceCell,
  EmptyState,
  ErrorBanner,
  SkeletonRows,
  StatusTag,
} from '@/components/primitives';
import {useDevices} from '@/contexts/DeviceContext';
import {useApiErrors} from '@/hooks/useApiErrors';
import {usePreferences} from '@/hooks/usePreferences';
import {isAlertable} from '@/services/device.service';
import type {Device} from '@/types/models';
import {deviceLabel, deviceTypeLabel, relativeTime} from '@/utils/format';

type StatusFilter = 'all' | 'online' | 'offline';
type SortKey = 'name' | 'status' | 'battery';

const COLUMNS = 6;

/** Order for the status sort: reachable first, then off-network, then asleep. */
const STATUS_RANK: Record<Device['status'], number> = {ONLINE: 0, UNKNOWN: 1, OFFLINE: 2};

export function DevicesPage(): ReactElement {
  const {devices, loading, loaded, errors, remove} = useDevices();
  const {preferences, setPreferences} = usePreferences();
  const removeErrors = useApiErrors();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [query, setQuery] = useState('');
  const [alertTargets, setAlertTargets] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState<Device | null>(null);
  const [removing, setRemoving] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = devices.filter(device => {
      if (status === 'online' && device.status !== 'ONLINE') {
        return false;
      }
      // "Offline" in the filter means "not reachable", which includes
      // UNKNOWN -- a device that answered from another network is no more
      // alertable than one that is asleep.
      if (status === 'offline' && device.status === 'ONLINE') {
        return false;
      }
      if (needle === '') {
        return true;
      }
      return deviceLabel(device).toLowerCase().includes(needle);
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'status') {
        return STATUS_RANK[a.status] - STATUS_RANK[b.status];
      }
      if (sort === 'battery') {
        // Devices with no reported battery sort last rather than as 0%, which
        // would put an unknown level among the ones about to die.
        return (b.battery_level ?? -1) - (a.battery_level ?? -1);
      }
      return deviceLabel(a).localeCompare(deviceLabel(b));
    });
  }, [devices, status, sort, query]);

  const filtersApplied = status !== 'all' || query.trim() !== '';

  const confirmRemove = async (): Promise<void> => {
    if (confirming === null) {
      return;
    }
    setRemoving(true);
    removeErrors.clear();
    try {
      await remove(confirming.device_id);
      setConfirming(null);
    } catch (error) {
      removeErrors.capture(error);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <ErrorBanner errors={errors} />
      <ErrorBanner errors={removeErrors.banner} onDismiss={removeErrors.clear} />

      <div className="toolbar">
        <label className="sr-only" htmlFor="device-search">
          Search devices
        </label>
        <input
          id="device-search"
          className="input"
          type="search"
          placeholder="Search devices"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />

        <label className="sr-only" htmlFor="status-filter">
          Filter by status
        </label>
        <select
          id="status-filter"
          className="select"
          value={status}
          onChange={event => setStatus(event.target.value as StatusFilter)}
        >
          <option value="all">All status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>

        <label className="sr-only" htmlFor="sort-by">
          Sort by
        </label>
        <select
          id="sort-by"
          className="select"
          value={sort}
          onChange={event => setSort(event.target.value as SortKey)}
        >
          <option value="name">Sort by name</option>
          <option value="status">Sort by status</option>
          <option value="battery">Sort by battery</option>
        </select>

        <span className="toolbar-spacer" />

        <Button
          variant="primary"
          icon="bell"
          disabled={!devices.some(isAlertable)}
          onClick={() => setAlertTargets([])}
        >
          Send alert
        </Button>
      </div>

      <section className="panel">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Device name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Battery</th>
                <th>Last heartbeat</th>
                <th>Actions</th>
              </tr>
            </thead>

            {loading && !loaded ? (
              <SkeletonRows columns={COLUMNS} />
            ) : (
              <tbody>
                {visible.map(device => (
                  <tr key={device.device_id}>
                    <td>
                      <DeviceCell device={device} />
                    </td>
                    <td>{deviceTypeLabel(device.device_type)}</td>
                    <td>
                      <StatusTag status={device.status} />
                    </td>
                    <td>
                      <Battery level={device.battery_level} />
                    </td>
                    <td>{relativeTime(device.last_heartbeat)}</td>
                    <td>
                      <div style={{display: 'flex', gap: 'var(--space-2)'}}>
                        <Button
                          variant="primary"
                          small
                          disabled={!isAlertable(device)}
                          onClick={() => setAlertTargets([device.device_id])}
                        >
                          Send alert
                        </Button>
                        <Button
                          variant="danger"
                          small
                          icon="trash"
                          onClick={() => setConfirming(device)}
                          aria-label={`Remove ${deviceLabel(device)}`}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {loaded && visible.length === 0 && (
          <EmptyState
            title="No devices found"
            body={
              filtersApplied
                ? 'No device matches these filters.'
                : 'Register your first device using the mobile app.'
            }
            action={
              filtersApplied ? (
                <Button
                  onClick={() => {
                    setStatus('all');
                    setQuery('');
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}
      </section>

      {alertTargets !== null && (
        <SendAlertDialog
          devices={devices}
          initialSelection={alertTargets}
          preferences={preferences}
          onPreferencesChange={setPreferences}
          onClose={() => setAlertTargets(null)}
        />
      )}

      {confirming !== null && (
        <Dialog
          title="Remove device"
          onClose={() => setConfirming(null)}
          actions={
            <>
              <Button onClick={() => setConfirming(null)} disabled={removing}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void confirmRemove()} disabled={removing}>
                {removing ? 'Removing…' : 'Remove'}
              </Button>
            </>
          }
        >
          <ErrorBanner errors={removeErrors.banner} />
          <p>
            <strong>{deviceLabel(confirming)}</strong> will stop appearing here and can no longer
            be alerted.
          </p>
          <p style={{marginTop: 'var(--space-2)'}}>
            {confirming.is_guest
              ? 'This is a guest device. It can rejoin by opening the app on this network again.'
              : 'The owner can register it again from the mobile app.'}
          </p>
        </Dialog>
      )}
    </>
  );
}
