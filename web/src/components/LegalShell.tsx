/**
 * The chrome a legal document gets when there is nobody signed in.
 *
 * `Layout` cannot serve here: it draws a sidebar of sections that need a
 * session, an identity block, a log-out button, and it sits inside
 * `DeviceProvider`. A reader who followed a link from an app-store listing has
 * none of that and wants none of it.
 *
 * So this is the whole of it — the mark, the product name, the document, and
 * the way back to sign in. A layout route rather than a wrapper inside the
 * page, so the same document component renders identically on both sides of
 * the gate.
 */

import {Link, Outlet} from 'react-router-dom';
import type {ReactElement} from 'react';

import {BrandMark} from '@/components/Icon';
import {ICON_SIZE, ROUTES} from '@/utils/constants';

export function LegalShell(): ReactElement {
  return (
    <div className="legal-shell">
      <header className="legal-shell-bar">
        <Link to={ROUTES.LOGIN} className="legal-brand">
          <span className="brand-tile">
            <BrandMark size={ICON_SIZE.xlarge} />
          </span>
          <span className="brand-name">BeepMyDevice</span>
        </Link>
        <Link to={ROUTES.LOGIN} className="btn btn-secondary btn-sm">
          Sign in
        </Link>
      </header>

      <main className="legal-shell-body">
        <Outlet />
      </main>
    </div>
  );
}
