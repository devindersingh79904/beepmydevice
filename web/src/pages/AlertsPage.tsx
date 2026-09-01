/**
 * The full alert history.
 *
 * Two things in the canvas need saying plainly here.
 *
 * The status filter offers "Partial". The server has no such state: alert
 * authorization runs three checks — one network, sender is the admin, targets
 * reachable — and any failure aborts the whole request. There is no partial
 * delivery to filter for, so the options are the three states `AlertStatus`
 * actually has.
 *
 * The table has a "Sent by" column. `alert_logs` does record `sender_user_id`,
 * but `AlertLogResponse` does not expose it, and one network has exactly one
 * admin — so every row this endpoint can return was sent by the person reading
 * it. The column says "You" rather than pretending to a lookup that has no
 * endpoint behind it.
 */

import {useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import {Dialog} from '@/components/Dialog';
import {
  AlertStatusTag,
  Button,
  EmptyState,
  ErrorBanner,
  SkeletonRows,
} from '@/components/primitives';
import {useDevices} from '@/contexts/DeviceContext';
import {useAlerts} from '@/hooks/useAlerts';
import {targetKind, targetNames} from '@/services/alert.service';
import type {AlertLog, AlertStatus} from '@/types/models';
import {DAY_MS, DEFAULT_PAGE_SIZE} from '@/utils/constants';
import {count, timestamp} from '@/utils/format';

type StatusFilter = 'all' | AlertStatus;
type RangeFilter = 'all' | '7' | '30';

const COLUMNS = 6;

export function AlertsPage(): ReactElement {
  const {devices} = useDevices();
  const {alerts, pagination, loading, loaded, errors, page, setPage} =
    useAlerts(DEFAULT_PAGE_SIZE);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [range, setRange] = useState<RangeFilter>('all');
  const [deviceId, setDeviceId] = useState<string>('all');
  const [detail, setDetail] = useState<AlertLog | null>(null);

  /**
   * Filtering is client-side, over the page already fetched.
   *
   * The endpoint accepts `page` and `limit` only — no filter parameters
   * exist — so this narrows the current page rather than the whole history.
   * The footer says which, so a page that filters down to three rows is not
   * mistaken for a history that holds three.
   */
  const visible = useMemo(() => {
    const earliest = range === 'all' ? 0 : Date.now() - Number(range) * DAY_MS;

    return alerts.filter(alert => {
      if (status !== 'all' && alert.status !== status) {
        return false;
      }
      if (deviceId !== 'all' && !alert.target_devices.includes(deviceId)) {
        return false;
      }
      return Date.parse(alert.created_at) >= earliest;
    });
  }, [alerts, status, range, deviceId]);

  const filtersApplied = status !== 'all' || range !== 'all' || deviceId !== 'all';

  return (
    <>
      <ErrorBanner errors={errors} />

      <div className="toolbar">
        <label className="sr-only" htmlFor="range-filter">
          Date range
        </label>
        <select
          id="range-filter"
          className="select"
          value={range}
          onChange={event => setRange(event.target.value as RangeFilter)}
        >
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>

        <label className="sr-only" htmlFor="device-filter">
          Device
        </label>
        <select
          id="device-filter"
          className="select"
          value={deviceId}
          onChange={event => setDeviceId(event.target.value)}
        >
          <option value="all">All devices</option>
          {devices.map(device => (
            <option key={device.device_id} value={device.device_id}>
              {device.device_name ?? 'Unnamed device'}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="alert-status-filter">
          Status
        </label>
        <select
          id="alert-status-filter"
          className="select"
          value={status}
          onChange={event => setStatus(event.target.value as StatusFilter)}
        >
          <option value="all">All status</option>
          <option value="SENT">Sent</option>
          <option value="RECEIVED">Received</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Full alert history</h2>
          {pagination !== null && (
            <span className="row-sub">
              {count(pagination.total_count, 'alert')} in total
            </span>
          )}
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Sent by</th>
                <th>Devices</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            {loading && !loaded ? (
              <SkeletonRows columns={COLUMNS} />
            ) : (
              <tbody>
                {visible.map(alert => (
                  <tr key={alert.alert_id}>
                    <td>{timestamp(alert.created_at)}</td>
                    {/* One network has one admin, and this endpoint only
                        returns that admin's own alerts. */}
                    <td>You</td>
                    <td>{targetNames(alert, devices).join(', ')}</td>
                    <td>{targetKind(alert)}</td>
                    <td>
                      <AlertStatusTag status={alert.status} />
                    </td>
                    <td>
                      <Button small onClick={() => setDetail(alert)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {loaded && visible.length === 0 && (
          <EmptyState
            title="No alerts found"
            body={
              filtersApplied
                ? 'No alert on this page matches these filters.'
                : 'Alerts you send will be listed here, newest first.'
            }
            action={
              filtersApplied ? (
                <Button
                  onClick={() => {
                    setStatus('all');
                    setRange('all');
                    setDeviceId('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {pagination !== null && pagination.total_pages > 1 && (
          <div
            className="panel-head"
            style={{borderBottom: 0, borderTop: 'var(--rule-section) solid var(--color-divider)'}}
          >
            <span className="row-sub">
              Page {pagination.current_page} of {pagination.total_pages}
              {filtersApplied && ' — filters apply to this page only'}
            </span>
            <div style={{display: 'flex', gap: 'var(--space-2)'}}>
              <Button small disabled={!pagination.has_prev} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button small disabled={!pagination.has_next} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      {detail !== null && (
        <Dialog
          title="Alert details"
          onClose={() => setDetail(null)}
          actions={
            <Button variant="primary" onClick={() => setDetail(null)}>
              Close
            </Button>
          }
        >
          <div className="setting-row">
            <span className="setting-name">Alert ID</span>
            <code>{detail.alert_id}</code>
          </div>
          <div className="setting-row">
            <span className="setting-name">Timestamp</span>
            <span>{timestamp(detail.created_at)}</span>
          </div>
          <div className="setting-row">
            <span className="setting-name">Status</span>
            <AlertStatusTag status={detail.status} />
          </div>

          <p className="card-kicker" style={{marginTop: 'var(--space-3)'}}>
            Sent to
          </p>
          <ul style={{margin: 0, paddingLeft: 'var(--space-4)'}}>
            {targetNames(detail, devices).map(name => (
              <li key={name}>{name}</li>
            ))}
          </ul>

          {detail.status === 'SENT' && (
            <p className="setting-note" style={{marginTop: 'var(--space-3)'}}>
              SENT means the push was handed to the provider. Devices do not yet
              acknowledge receipt, so no alert reaches RECEIVED in Phase 1.
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}
