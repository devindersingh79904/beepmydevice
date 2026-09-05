/**
 * The dashboard chrome: sidebar, top bar, page.
 *
 * The sidebar is a sticky flex child, not a fixed element — see `layout.css`
 * for why that distinction is worth being deliberate about.
 */

import {NavLink, Outlet, useLocation} from 'react-router-dom';
import type {ReactElement} from 'react';

import {BrandMark, Icon} from '@/components/Icon';
import type {IconName} from '@/components/Icon';
import {Button} from '@/components/primitives';
import {useAuth} from '@/contexts/AuthContext';
import {useDevices} from '@/contexts/DeviceContext';
import {ICON_SIZE, ROUTES} from '@/utils/constants';
import {initials} from '@/utils/format';

interface NavEntry {
  to: string;
  label: string;
  icon: IconName;
  /** Exact match, for the index route that would otherwise match everything. */
  end?: boolean;
}

const NAV: NavEntry[] = [
  {to: ROUTES.DASHBOARD, label: 'Dashboard', icon: 'home', end: true},
  {to: ROUTES.DEVICES, label: 'Devices', icon: 'smartphone'},
  {to: ROUTES.ACTIVITY, label: 'Activity', icon: 'activity'},
  {to: ROUTES.ALERTS, label: 'Alerts', icon: 'bell'},
  {to: ROUTES.SETTINGS, label: 'Settings', icon: 'sliders'},
];

const TITLES: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.DEVICES]: 'Devices',
  [ROUTES.ACTIVITY]: 'Activity',
  [ROUTES.ALERTS]: 'Alerts',
  [ROUTES.SETTINGS]: 'Settings',
  // Reached from Settings, not from the sidebar -- it is a document, not a
  // section of the product.
  [ROUTES.PRIVACY]: 'Privacy policy',
};

/** The mark inside the 36px sidebar tile, inset so the tile reads as a frame. */
const BRAND_TILE_MARK = 22;

export function Layout(): ReactElement {
  const {session, signOut} = useAuth();
  const {live} = useDevices();
  const {pathname} = useLocation();

  const title = TITLES[pathname] ?? 'Dashboard';
  const email = session?.email ?? '';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-tile">
            <BrandMark size={BRAND_TILE_MARK} />
          </span>
          <span className="brand-name">BeepMyDevice</span>
        </div>

        <nav className="sidebar-nav" aria-label="Sections">
          {NAV.map(entry => (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.end}
              className={({isActive}) => (isActive ? 'nav-item is-active' : 'nav-item')}
            >
              <Icon name={entry.icon} size={ICON_SIZE.large} />
              <span>{entry.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="identity">
            <span className="avatar">{initials(email)}</span>
            <span className="identity-text">
              {/* The account has no display name -- the API does not return
                  one -- so the address it signed in with is the identity. */}
              <span className="identity-email" title={email}>
                {email}
              </span>
            </span>
          </div>
          <Button
            icon="log-out"
            onClick={() => void signOut()}
            className="btn-block btn-logout"
          >
            Log out
          </Button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="topbar-title">{title}</h1>
          <div className="topbar-actions">
            {/* Whether status is live is worth stating plainly: every number on
                these screens is only as fresh as this socket, and a silent
                disconnect would leave a stale dashboard looking current. */}
            <span className={live ? 'conn is-live' : 'conn'}>
              <span className="conn-dot" aria-hidden />
              {live ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
