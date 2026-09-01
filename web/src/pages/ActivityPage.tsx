/**
 * Activity: the shape of alerting over the last week.
 *
 * There is no statistics endpoint. Every figure here is computed in the
 * browser from a bounded sample of real alert rows, and the screen says so
 * rather than implying it counted all of history — a delivery rate that
 * silently covers "the last hundred alerts" while looking like an all-time
 * figure is worse than no figure.
 */

import {useMemo} from 'react';
import type {ReactElement} from 'react';

import {ActivityChart} from '@/components/ActivityChart';
import {
  AlertStatusTag,
  EmptyState,
  ErrorBanner,
  SkeletonRows,
  Stat,
} from '@/components/primitives';
import {useDevices} from '@/contexts/DeviceContext';
import {useAlerts} from '@/hooks/useAlerts';
import {bucketByDay, deliveryRate, mostAlerted, targetNames} from '@/services/alert.service';
import {ACTIVITY_SAMPLE_SIZE, ACTIVITY_WINDOW_DAYS} from '@/utils/constants';
import {count, timestamp} from '@/utils/format';

const COLUMNS = 3;
const RECENT_ROWS = 8;

export function ActivityPage(): ReactElement {
  const {devices} = useDevices();
  const {alerts, loading, loaded, errors} = useAlerts(ACTIVITY_SAMPLE_SIZE);

  const days = useMemo(() => bucketByDay(alerts, ACTIVITY_WINDOW_DAYS), [alerts]);
  const thisWeek = useMemo(() => days.reduce((total, day) => total + day.count, 0), [days]);
  const rate = useMemo(() => deliveryRate(alerts), [alerts]);
  const top = useMemo(() => mostAlerted(alerts, devices), [alerts, devices]);
  const recent = useMemo(() => alerts.slice(0, RECENT_ROWS), [alerts]);

  return (
    <>
      <ErrorBanner errors={errors} />

      <section className="stat-grid">
        <Stat
          label="Alerts this week"
          value={String(thisWeek)}
          note={`Last ${ACTIVITY_WINDOW_DAYS} days`}
          icon="bell"
          muted={thisWeek === 0}
        />
        <Stat
          label="Delivery rate"
          /* Null rather than 0% for an empty sample: "0%" reads as total
             failure, which is a very different thing from "nothing sent". */
          value={rate === null ? '—' : `${rate}%`}
          note={
            alerts.length === 0
              ? 'No alerts to measure'
              : `Across the last ${count(alerts.length, 'alert')}`
          }
          icon="activity"
          muted={rate === null}
        />
        <Stat
          label="Most alerted"
          value={top?.name ?? '—'}
          note={top === null ? 'No alerts yet' : count(top.count, 'alert')}
          icon="smartphone"
          muted={top === null}
          small
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Alert activity (last {ACTIVITY_WINDOW_DAYS} days)</h2>
        </div>
        <ActivityChart days={days} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Recent activity</h2>
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Devices</th>
                <th>Status</th>
              </tr>
            </thead>

            {loading && !loaded ? (
              <SkeletonRows columns={COLUMNS} rows={5} />
            ) : (
              <tbody>
                {recent.map(alert => (
                  <tr key={alert.alert_id}>
                    <td>{timestamp(alert.created_at)}</td>
                    <td>{targetNames(alert, devices).join(', ')}</td>
                    <td>
                      <AlertStatusTag status={alert.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {loaded && recent.length === 0 && (
          <EmptyState
            title="No activity yet"
            body="Alerts you send will be listed here, newest first."
          />
        )}
      </section>
    </>
  );
}
