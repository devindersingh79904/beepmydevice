/**
 * The send-alert modal.
 *
 * Three things in the canvas do not map straight onto the API, and each is
 * handled here rather than faked:
 *
 *   Sound / Vibration — these are the *recipient's* stored preferences, which
 *     the server consults before it pushes. They are saved to
 *     `PUT /auth/preferences`, not sent with the alert; a sender must not be
 *     able to override what a device's owner chose.
 *
 *   Custom message — `POST /alerts/send` accepts `device_ids` and nothing
 *     else. The field is drawn and disabled rather than dropped, because the
 *     design is the specification and a silently missing control reads as
 *     finished.
 *
 *   Partial delivery — the canvas has a "Partial" state. The server has no
 *     such thing: if the targets span two networks, or the sender does not
 *     administer the network, or nothing reachable is left, the whole request
 *     is refused and nothing is alerted. The result list below reflects that.
 */

import {useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import {Dialog} from '@/components/Dialog';
import {
  Button,
  Checkbox,
  ErrorBanner,
  GuestTag,
  StatusTag,
  Toggle,
} from '@/components/primitives';
import {useApiErrors} from '@/hooks/useApiErrors';
import * as alertService from '@/services/alert.service';
import {isAlertable} from '@/services/device.service';
import * as authService from '@/services/auth.service';
import type {Device, NotificationPreferences, SendAlertResult} from '@/types/models';
import {NOT_YET_AVAILABLE, SHORT_ID_LENGTH} from '@/utils/constants';
import {deviceLabel, deviceTypeLabel} from '@/utils/format';

interface SendAlertDialogProps {
  devices: Device[];
  /** Pre-selected target, when the dialog is opened from one device's row. */
  initialSelection?: string[];
  preferences: NotificationPreferences | null;
  onPreferencesChange: (next: NotificationPreferences) => void;
  onClose: () => void;
}

export function SendAlertDialog({
  devices,
  initialSelection = [],
  preferences,
  onPreferencesChange,
  onClose,
}: SendAlertDialogProps): ReactElement {
  const reachable = useMemo(() => devices.filter(isAlertable), [devices]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelection));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendAlertResult | null>(null);
  const errors = useApiErrors();

  const allSelected = reachable.length > 0 && selected.size === reachable.length;

  const toggle = (deviceId: string): void => {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const toggleAll = (): void => {
    setSelected(allSelected ? new Set() : new Set(reachable.map(device => device.device_id)));
  };

  const savePreference = async (patch: Partial<NotificationPreferences>): Promise<void> => {
    try {
      onPreferencesChange(await authService.updatePreferences(patch));
    } catch (error) {
      errors.capture(error);
    }
  };

  const send = async (): Promise<void> => {
    setSending(true);
    errors.clear();
    try {
      // An empty selection means "every device on the network" to the API.
      // The button is worded to match, so nobody sends to everything while
      // believing they sent to nothing.
      setResult(await alertService.sendAlert([...selected]));
    } catch (error) {
      errors.capture(error);
    } finally {
      setSending(false);
    }
  };

  if (result !== null) {
    return (
      <Dialog
        title="Alert sent"
        onClose={onClose}
        actions={
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <p style={{marginBottom: 'var(--space-3)'}}>
          Alert <code>{result.alert_id.slice(0, SHORT_ID_LENGTH)}</code> went to{' '}
          {result.delivery_status.length === 1
            ? '1 device'
            : `${result.delivery_status.length} devices`}
          .
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {result.delivery_status.map(entry => (
              <tr key={entry.device_id}>
                <td>{entry.device_name ?? 'Unnamed device'}</td>
                <td>
                  {entry.status}
                  {entry.error_code !== null && (
                    <span className="banner-code"> ({entry.error_code})</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Dialog>
    );
  }

  return (
    <Dialog
      title="Send alert"
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void send()}
            disabled={sending || reachable.length === 0}
          >
            {sending
              ? 'Sending…'
              : selected.size === 0
                ? `Send to all ${reachable.length}`
                : `Send to ${selected.size}`}
          </Button>
        </>
      }
    >
      <ErrorBanner errors={errors.banner} onDismiss={errors.clear} />

      {reachable.length === 0 ? (
        <p>
          No device on this network is reachable right now. A device has to have
          sent a heartbeat recently to be alerted.
        </p>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              paddingBottom: 'var(--space-2)',
            }}
          >
            <Checkbox checked={allSelected} onChange={toggleAll} label="Select all devices" />
            <span>Select all</span>
          </div>

          <div style={{display: 'flex', flexDirection: 'column'}}>
            {reachable.map(device => (
              <label
                key={device.device_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) 0',
                  borderTop: 'var(--rule-row) solid var(--color-divider)',
                  cursor: 'pointer',
                }}
              >
                <Checkbox
                  checked={selected.has(device.device_id)}
                  onChange={() => toggle(device.device_id)}
                  label={`Alert ${deviceLabel(device)}`}
                />
                <span style={{flex: 1}}>
                  {deviceLabel(device)} {device.is_guest && <GuestTag />}
                  <span className="row-sub">{deviceTypeLabel(device.device_type)}</span>
                </span>
                <StatusTag status={device.status} />
              </label>
            ))}
          </div>

          <div className="hr" style={{margin: 'var(--space-4) 0 var(--space-3)'}} />

          {/* Recipient preferences, saved immediately. Labelled as such so it
              is clear these outlive this one alert. */}
          <div className="setting-row">
            <span>
              <span className="setting-name">Sound</span>
              <span className="setting-note">Saved to your account, applies to every alert</span>
            </span>
            <Toggle
              checked={preferences?.sound_enabled ?? true}
              onChange={next => void savePreference({sound_enabled: next})}
              label="Play a sound on the target device"
              disabled={preferences === null}
            />
          </div>

          <div className="setting-row">
            <span>
              <span className="setting-name">Vibration</span>
              <span className="setting-note">Saved to your account, applies to every alert</span>
            </span>
            <Toggle
              checked={preferences?.vibration_enabled ?? true}
              onChange={next => void savePreference({vibration_enabled: next})}
              label="Vibrate the target device"
              disabled={preferences === null}
            />
          </div>

          <div className="field" style={{marginTop: 'var(--space-3)'}}>
            <label htmlFor="alert-message">Custom message (optional)</label>
            <textarea
              id="alert-message"
              className="input"
              disabled
              placeholder={NOT_YET_AVAILABLE}
            />
            <span className="field-error">
              The alert endpoint accepts target devices only in Phase 1.
            </span>
          </div>
        </>
      )}
    </Dialog>
  );
}
