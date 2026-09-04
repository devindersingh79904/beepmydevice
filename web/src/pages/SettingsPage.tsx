/**
 * Settings.
 *
 * The canvas puts six sections behind a 200px sub-nav. Three of them are fully
 * backed by the API — password, notifications, guests. Three are not: profile
 * editing, WiFi network renaming and account deletion have no endpoint in
 * Phase 1.
 *
 * Those three are drawn and disabled, with the reason stated, rather than
 * removed. The design is the specification; a screen that quietly drops half
 * of it looks finished when it is not, and the next person to open this file
 * has no way to tell the difference between "not built" and "not wanted".
 */

import {useMemo, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';


import {PolicyDates, PolicySections} from '@/components/PolicyDocument';
import {
  Button,
  ErrorBanner,
  Field,
  GuestTag,
  PasswordInput,
  StatusTag,
  Toggle,
} from '@/components/primitives';
import {useAuth} from '@/contexts/AuthContext';
import {useDevices} from '@/contexts/DeviceContext';
import {useApiErrors} from '@/hooks/useApiErrors';
import {usePreferences} from '@/hooks/usePreferences';
import * as authService from '@/services/auth.service';
import {NOT_YET_AVAILABLE} from '@/utils/constants';
import {deviceLabel, relativeTime, shortDate} from '@/utils/format';

type Section =
  | 'profile'
  | 'password'
  | 'notifications'
  | 'guests'
  | 'network'
  | 'about'
  | 'privacy';

const SECTIONS: {id: Section; label: string}[] = [
  {id: 'profile', label: 'Profile'},
  {id: 'password', label: 'Password'},
  {id: 'notifications', label: 'Notifications'},
  {id: 'guests', label: 'Manage guests'},
  {id: 'network', label: 'WiFi networks'},
  {id: 'about', label: 'About'},
  {id: 'privacy', label: 'Privacy'},
];

export function SettingsPage(): ReactElement {
  const [section, setSection] = useState<Section>('profile');

  return (
    <div className="settings">
      <nav className="settings-nav" aria-label="Settings sections">
        {SECTIONS.map(entry => (
          <button
            key={entry.id}
            type="button"
            className={section === entry.id ? 'nav-item is-active' : 'nav-item'}
            aria-current={section === entry.id ? 'page' : undefined}
            onClick={() => setSection(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <div className="settings-panels">
        {section === 'profile' && <ProfileSection />}
        {section === 'password' && <PasswordSection />}
        {section === 'notifications' && <NotificationsSection />}
        {section === 'guests' && <GuestsSection />}
        {section === 'network' && <NetworkSection />}
        {section === 'about' && <AboutSection onOpenPrivacy={() => setSection('privacy')} />}
        {section === 'privacy' && <PrivacySection />}
      </div>
    </div>
  );
}

/* --- profile ------------------------------------------------------------ */

function ProfileSection(): ReactElement {
  const {session} = useAuth();

  return (
    <section className="panel settings-section">
      <h2 className="panel-title">Profile</h2>

      <Field label="Email" htmlFor="profile-email">
        <input id="profile-email" className="input" value={session?.email ?? ''} disabled />
      </Field>

      <p className="setting-note">
        {/* Honest about where this came from: login returns user_id, token and
            expires_at, and nothing else. This is the address typed at sign-in,
            cached for display. */}
        This is the address you signed in with, kept locally. The API returns no
        profile, so it cannot be confirmed or changed here.
      </p>

      <div className="hr" style={{margin: 'var(--space-3) 0'}} />

      <div className="setting-row">
        <span>
          <span className="setting-name">Display name</span>
          <span className="setting-note">{NOT_YET_AVAILABLE}</span>
        </span>
        <Button disabled>Edit</Button>
      </div>

      <div className="setting-row">
        <span>
          <span className="setting-name">Profile photo</span>
          <span className="setting-note">{NOT_YET_AVAILABLE}</span>
        </span>
        <Button disabled>Upload photo</Button>
      </div>

      {session !== null && (
        <p className="setting-note">Session expires {shortDate(session.expires_at)}.</p>
      )}
    </section>
  );
}

/* --- password ----------------------------------------------------------- */

function PasswordSection(): ReactElement {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const errors = useApiErrors();

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    errors.clear();
    setDone(false);
    setMismatch(false);

    if (next !== confirm) {
      setMismatch(true);
      return;
    }

    setBusy(true);
    try {
      await authService.changePassword(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (error) {
      errors.capture(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel settings-section" onSubmit={event => void submit(event)}>
      <h2 className="panel-title">Change password</h2>

      <ErrorBanner errors={errors.banner} onDismiss={errors.clear} />
      {done && <p className="setting-note">Password updated.</p>}

      <Field
        label="Current password"
        htmlFor="current-password"
        error={errors.fields.current_password}
      >
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          required
          invalid={errors.fields.current_password !== undefined}
          value={current}
          onChange={setCurrent}
        />
      </Field>

      <Field label="New password" htmlFor="new-password" error={errors.fields.new_password}>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          required
          invalid={errors.fields.new_password !== undefined}
          value={next}
          onChange={setNext}
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirm-password"
        error={mismatch ? 'The two passwords do not match.' : undefined}
      >
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          required
          invalid={mismatch}
          value={confirm}
          onChange={setConfirm}
        />
      </Field>

      <p className="setting-note">
        {/* Worth stating: it is the reason the current password is asked for
            at all, and users otherwise read it as a pointless extra field. */}
        The current password is required so that a stolen session token alone
        cannot lock you out of your own account.
      </p>

      <div>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
        </Button>
      </div>
    </form>
  );
}

/* --- notifications ------------------------------------------------------ */

function NotificationsSection(): ReactElement {
  const {preferences, setPreferences} = usePreferences();
  const errors = useApiErrors();

  const save = async (patch: Record<string, boolean>): Promise<void> => {
    errors.clear();
    try {
      setPreferences(await authService.updatePreferences(patch));
    } catch (error) {
      errors.capture(error);
    }
  };

  const rows: {key: 'notifications_enabled' | 'sound_enabled' | 'vibration_enabled'; name: string; note: string}[] = [
    {
      key: 'notifications_enabled',
      name: 'Notifications',
      note: 'When off, your devices are not pushed to at all.',
    },
    {key: 'sound_enabled', name: 'Sound', note: 'Ring at full volume, overriding the silent switch.'},
    {key: 'vibration_enabled', name: 'Vibration', note: 'Vibrate as well as ring.'},
  ];

  return (
    <section className="panel settings-section">
      <h2 className="panel-title">Notifications</h2>

      <ErrorBanner errors={errors.banner} onDismiss={errors.clear} />

      {rows.map(row => (
        <div className="setting-row" key={row.key}>
          <span>
            <span className="setting-name">{row.name}</span>
            <span className="setting-note">{row.note}</span>
          </span>
          <Toggle
            checked={preferences?.[row.key] ?? false}
            onChange={value => void save({[row.key]: value})}
            label={row.name}
            /* Disabled until they load: defaulting to "on" would show a state
               the server may not agree with, and the user would believe they
               had changed something that never arrived. */
            disabled={preferences === null}
          />
        </div>
      ))}

      <p className="setting-note">
        These are enforced on the server. A device whose owner has notifications
        off is not pushed to, whatever any sender's screen shows.
      </p>
    </section>
  );
}

/* --- guests ------------------------------------------------------------- */

function GuestsSection(): ReactElement {
  const {devices, remove} = useDevices();
  const errors = useApiErrors();
  const guests = useMemo(() => devices.filter(device => device.is_guest), [devices]);

  const drop = async (deviceId: string): Promise<void> => {
    errors.clear();
    try {
      await remove(deviceId);
    } catch (error) {
      errors.capture(error);
    }
  };

  return (
    <section className="panel settings-section">
      <h2 className="panel-title">Manage guests</h2>

      <ErrorBanner errors={errors.banner} onDismiss={errors.clear} />

      {guests.length === 0 ? (
        <p className="setting-note">No guest devices on this network.</p>
      ) : (
        guests.map(guest => (
          <div className="setting-row" key={guest.device_id}>
            <span>
              <span className="setting-name">
                {deviceLabel(guest)} <GuestTag />
              </span>
              <span className="setting-note">
                Last heartbeat {relativeTime(guest.last_heartbeat)}
              </span>
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: 'var(--space-3)'}}>
              <StatusTag status={guest.status} />
              <Button variant="danger" small icon="trash" onClick={() => void drop(guest.device_id)}>
                Remove
              </Button>
            </span>
          </div>
        ))
      )}

      <p className="setting-note">
        A guest joined without an account. It receives alerts and reports its
        status, and can do nothing else — it holds a token scoped to its own
        heartbeat, so it cannot list this network or send an alert. Removing it
        here is the control that makes open joining safe.
      </p>
    </section>
  );
}

/* --- network ------------------------------------------------------------ */

function NetworkSection(): ReactElement {
  return (
    <section className="panel settings-section">
      <h2 className="panel-title">WiFi networks</h2>

      <p className="setting-note">
        {/* No endpoint returns the network. DeviceResponse carries no wifi_id,
            no BSSID and no network name, so there is nothing to list here
            without inventing it. */}
        The API does not expose the network record in Phase 1 — no endpoint
        returns its name or router MAC — so there is nothing to show or rename
        here yet.
      </p>

      <div className="setting-row">
        <span>
          <span className="setting-name">Rename network</span>
          <span className="setting-note">{NOT_YET_AVAILABLE}</span>
        </span>
        <Button disabled>Rename</Button>
      </div>

      <p className="setting-note">
        The network is claimed by whoever registers the first device on it, and
        its router MAC is the boundary every alert is authorized against.
      </p>
    </section>
  );
}

/* --- privacy ------------------------------------------------------------ */

/**
 * The policy, inside Settings.
 *
 * The canvas draws it as a 760px card with the date on the heading row rather
 * than the two labelled cells the standalone page uses -- there is no room for
 * those beside a title. The sections themselves are the same component, so the
 * two renderings cannot say different things.
 */
function PrivacySection(): ReactElement {
  return (
    <section className="panel settings-section legal legal-panel">
      <header className="legal-panel-head">
        <h2>Privacy policy</h2>
        <PolicyDates />
      </header>
      <PolicySections />
    </section>
  );
}

/* --- about -------------------------------------------------------------- */

function AboutSection({onOpenPrivacy}: {onOpenPrivacy: () => void}): ReactElement {
  return (
    <section className="panel settings-section">
      <h2 className="panel-title">About</h2>

      <div className="setting-row">
        <span className="setting-name">Version</span>
        <span className="row-sub">Phase 1</span>
      </div>
      <div className="setting-row">
        <span>
          <span className="setting-name">Terms of service</span>
          {/* Not `NOT_YET_AVAILABLE`: this one is not waiting on an endpoint,
              it is waiting on somebody writing the document. */}
          <span className="setting-note">Not written yet.</span>
        </span>
        <Button disabled>View</Button>
      </div>
      <div className="setting-row">
        <span className="setting-name">Privacy policy</span>
        {/* The canvas keeps the reader inside Settings: "View" selects the
            Privacy tab rather than leaving for /privacy. That route still
            exists, and is what an app-store listing and the register form
            link to -- it is the only way in for someone with no session. */}
        <Button onClick={onOpenPrivacy}>View</Button>
      </div>

      <div className="hr" style={{margin: 'var(--space-4) 0 var(--space-2)'}} />

      <h3>Danger zone</h3>
      <div className="setting-row">
        <span>
          <span className="setting-name">Delete account</span>
          <span className="setting-note">
            {NOT_YET_AVAILABLE} Deleting an account has to decide what happens
            to the network it claimed and the guests on it, which is a design
            question and not only a missing route.
          </span>
        </span>
        <Button variant="danger" disabled>
          Delete account
        </Button>
      </div>
    </section>
  );
}
