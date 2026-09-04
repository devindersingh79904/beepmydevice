/**
 * Routing and the authentication gate.
 *
 * One decision lives here: signed in, or not. Everything behind the gate can
 * assume a session exists, so no screen has to guard for a null user.
 */

import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import type {ReactElement} from 'react';

import {Layout} from '@/components/Layout';
import {LegalShell} from '@/components/LegalShell';
import {AuthProvider, useAuth} from '@/contexts/AuthContext';
import {DeviceProvider} from '@/contexts/DeviceContext';
import {ActivityPage} from '@/pages/ActivityPage';
import {AlertsPage} from '@/pages/AlertsPage';
import {AuthPage} from '@/pages/AuthPage';
import {DashboardPage} from '@/pages/DashboardPage';
import {DevicesPage} from '@/pages/DevicesPage';
import {PrivacyPage} from '@/pages/PrivacyPage';
import {SettingsPage} from '@/pages/SettingsPage';
import {ROUTES} from '@/utils/constants';

function Gate(): ReactElement {
  const {session, restoring} = useAuth();

  // Nothing renders until the stored session has been checked. Rendering the
  // sign-in screen first and replacing it a tick later is a visible flash for
  // every returning user, on every load.
  if (restoring) {
    return <div className="auth-shell" aria-busy="true" />;
  }

  if (session === null) {
    return (
      <Routes>
        <Route path={ROUTES.LOGIN} element={<AuthPage />} />
        {/* The policy is public. An app-store listing links to it from outside
            the product, and someone deciding whether to sign up has to be able
            to read it before there is an account to read it with. */}
        <Route element={<LegalShell />}>
          <Route path={ROUTES.PRIVACY} element={<PrivacyPage />} />
        </Route>
        {/* Anything else, signed out, is the sign-in screen. */}
        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    );
  }

  return (
    <DeviceProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path={ROUTES.DEVICES} element={<DevicesPage />} />
          <Route path={ROUTES.ACTIVITY} element={<ActivityPage />} />
          <Route path={ROUTES.ALERTS} element={<AlertsPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          {/* Same document, this time in the dashboard chrome. */}
          <Route path={ROUTES.PRIVACY} element={<PrivacyPage />} />
        </Route>
        {/* Signed in, /login is not a place to be. */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </DeviceProvider>
  );
}

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
