/**
 * The dashboard: three summary tiles and the device table.
 *
 * Every number here is derived from data actually fetched. There is no
 * statistics endpoint, so nothing is estimated and nothing is invented — where
 * the canvas shows a figure the API cannot support, the tile says what it does
 * know instead.
 */

import {useMemo, useState} from 'react';
import type {ReactElement} from 'react';
import {Link} from 'react-router-dom';

import {SendAlertDialog} from '@/components/SendAlertDialog';
import {
  Battery,
  Button,
  DeviceCell,
  EmptyState,
  ErrorBanner,
  SkeletonRows,
  Stat,
  StatusTag,
} from '@/components/primitives';
import {useDevices} from '@/contexts/DeviceContext';
import {useAlerts} from '@/hooks/useAlerts';
import {usePreferences} from '@/hooks/usePreferences';
import {isAlertable} from '@/services/device.service';
import {sentToday} from '@/services/alert.service';
import {ACTIVITY_SAMPLE_SIZE, ROUTES} from '@/utils/constants';
import {deviceTypeLabel, relativeTime} from '@/utils/format';

const COLUMNS = 6;

export function DashboardPage(): ReactElement {
  const {devices, loading, loaded, errors, live} = useDevices();
  const {alerts} = useAlerts(ACTIVITY_SAMPLE_SIZE);
  const {preferences, setPreferences} = usePreferences();
  const [alertTargets, setAlertTargets] = useState<string[] | null>(null);

  const online = useMemo(() => devices.filter(isAlertable).length, [devices]);
  const today = useMemo(() => sentToday(alerts), [alerts]);

  return (
    <>
      <ErrorBanner errors={errors} />

      <section className="stat-grid">
        <Stat
          label="Active devices"
          value={String(online)}
          note={
            devices.length === online
              ? 'All devices online'
              : `${devices.length - online} not reachable`
          }
          icon="smartphone"
        />
        <Stat
          label="Alerts today"
          value={String(today)}
          note="Since midnight"
          icon="bell"
          muted={today === 0}
        />
        {/*
          The canvas names the network here ("Home Network · Strong signal").
          DeviceResponse carries no network name and no signal strength, so
          this tile reports what is actually known: whether the live status
          feed is connected.
        */}
        <Stat
          label="Status feed"
          value={live ? 'Live' : 'Reconnecting'}
          note={live ? 'Device status is up to date' : 'Showing the last known state'}
          icon="wifi"
          muted={!live}
          small
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Your devices</h2>
          <div style={{display: 'flex', gap: 'var(--space-2)'}}>
            <Link className="btn btn-ghost btn-sm" to={ROUTES.DEVICES}>
              View all
            </Link>
            <Button
              variant="primary"
              small
              icon="bell"
              disabled={online === 0}
              onClick={() => setAlertTargets([])}
            >
              Send alert
            </Button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Type</th>
                <th>Status</th>
                <th>Battery</th>
                <th>Last seen</th>
                <th>Actions</th>
              </tr>
            </thead>

            {loading && !loaded ? (
              <SkeletonRows columns={COLUMNS} />
            ) : (
              <tbody>
                {devices.map(device => (
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
                      <Button
                        variant="primary"
                        small
                        disabled={!isAlertable(device)}
                        onClick={() => setAlertTargets([device.device_id])}
                        /* Disabled here is a courtesy, not the control: the
                           server refuses an unreachable target regardless. */
                        title={
                          isAlertable(device)
                            ? undefined
                            : 'This device has not sent a heartbeat recently'
                        }
                      >
                        Send alert
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {loaded && devices.length === 0 && (
          <EmptyState
            title="No devices found"
            body="Register your first device using the mobile app — a browser cannot join a WiFi alert group on its own."
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
    </>
  );
}
