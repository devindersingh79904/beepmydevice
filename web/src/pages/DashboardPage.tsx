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
import {useDiscovered} from '@/hooks/useDiscovered';
import {usePreferences} from '@/hooks/usePreferences';
import {isAlertable} from '@/services/device.service';
import {sentToday} from '@/services/alert.service';
import {ACTIVITY_SAMPLE_SIZE, ROUTES} from '@/utils/constants';
import {deviceTypeLabel, relativeTime} from '@/utils/format';

const COLUMNS = 6;
const WIFI_COLUMNS = 6;

export function DashboardPage(): ReactElement {
  const {devices, loading, loaded, errors, live} = useDevices();
  const {alerts} = useAlerts(ACTIVITY_SAMPLE_SIZE);
  const {preferences, setPreferences} = usePreferences();
  const [alertTargets, setAlertTargets] = useState<string[] | null>(null);

  const alertable = useMemo(() => devices.filter(isAlertable).length, [devices]);
  const today = useMemo(() => sentToday(alerts), [alerts]);

  return (
    <>
      <ErrorBanner errors={errors} />

      <section className="stat-grid">
        {/*
          The canvas calls this ACTIVE DEVICES / "Online now", which is not
          what the number means and was the more misleading of the two. A phone
          stops heartbeating within a minute of being put down, so "online"
          counted almost nothing while every one of those devices could still
          be beeped. What the tile is for is knowing whether the button will
          work, so it counts that instead.
        */}
        <Stat
          label="Can be alerted"
          value={String(alertable)}
          note={
            devices.length === alertable
              ? 'Every device on this network'
              : `${devices.length - alertable} on another network`
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
              disabled={alertable === 0}
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

      <WifiPanel />

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

/* --- devices on your WiFi ----------------------------------------------- */

type RegistrationFilter = 'all' | 'registered' | 'unregistered';

const FILTERS: readonly {key: RegistrationFilter; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'registered', label: 'Registered'},
  {key: 'unregistered', label: 'Unregistered'},
];

/**
 * What else is on this network.
 *
 * Registered devices come from the device list; the rest are observations a
 * phone submitted after scanning. They are two different things and the table
 * says so rather than blending them: only the first can be alerted, and the
 * second has no push token at all.
 *
 * There is no Scan button here on purpose. A browser has no WiFi BSSID and
 * cannot open a socket to a local address, so it can neither scan nor prove
 * which network it is on — the scan runs in the mobile app, and this list is
 * as fresh as the last time somebody pressed it there.
 */
function WifiPanel(): ReactElement {
  const {devices} = useDevices();
  const {discovered, loading, loaded, errors, ignore} = useDiscovered();
  const [filter, setFilter] = useState<RegistrationFilter>('all');

  const showRegistered = filter !== 'unregistered';
  const showUnregistered = filter !== 'registered';
  const total = devices.length + discovered.length;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Devices on your WiFi</h2>
        <div className="seg">
          {FILTERS.map(option => (
            <button
              key={option.key}
              type="button"
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner errors={errors} />

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Type</th>
              <th>Address</th>
              <th>Registration</th>
              <th>Last seen</th>
              <th>Actions</th>
            </tr>
          </thead>

          {loading && !loaded ? (
            <SkeletonRows columns={WIFI_COLUMNS} />
          ) : (
            <tbody>
              {showRegistered &&
                devices.map(device => (
                  <tr key={device.device_id}>
                    <td>
                      <DeviceCell device={device} />
                    </td>
                    <td>{deviceTypeLabel(device.device_type)}</td>
                    {/* The registry stores no address: a device registers with
                        a BSSID and a push token, never an IP. */}
                    <td className="text-muted">—</td>
                    <td>
                      <span className="tag tag-accent">App installed</span>
                    </td>
                    <td>{relativeTime(device.last_heartbeat)}</td>
                    <td />
                  </tr>
                ))}

              {showUnregistered &&
                discovered.map(item => (
                  <tr key={item.discovered_id}>
                    <td>{item.device_name ?? 'Unnamed device'}</td>
                    <td>{item.device_type ?? 'Unknown'}</td>
                    <td>{item.ip_address}</td>
                    <td>
                      <span className="tag tag-neutral">Unregistered</span>
                    </td>
                    <td>{relativeTime(item.last_seen)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        small
                        onClick={() => void ignore(item.discovered_id)}
                      >
                        Ignore
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          )}
        </table>
      </div>

      {loaded && total === 0 && (
        <EmptyState
          title="Nothing scanned yet"
          body="Open the mobile app and press Scan this WiFi to see what else is on your network."
        />
      )}

      <p className="panel-note">
        Discovered devices are found by asking the network who is advertising a
        service and by probing each address in turn. That finds TVs, printers,
        speakers and routers — it does not find phones or laptops, which
        advertise nothing and answer nothing. This is what was discovered, not
        everything that is connected.
      </p>
    </section>
  );
}
