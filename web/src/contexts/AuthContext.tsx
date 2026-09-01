/**
 * The signed-in session.
 *
 * One source of truth for "is anyone signed in", so no screen has to read the
 * token out of storage and decide for itself.
 */

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import type {ReactElement, ReactNode} from 'react';

import * as authService from '@/services/auth.service';
import type {Session} from '@/types/models';
import {setUnauthorizedHandler} from '@/utils/api-client';

interface AuthContextValue {
  session: Session | null;
  /** True until the stored session has been checked, so nothing flashes. */
  restoring: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}): ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);

  // Restoring from storage is synchronous, but it must happen before the first
  // render decides which screen to show -- otherwise a returning user sees the
  // sign-in screen flash before the dashboard replaces it.
  useEffect(() => {
    setSession(authService.restoreSession());
    setRestoring(false);
  }, []);

  /**
   * Drop the session because the *server* rejected it.
   *
   * Distinct from signOut: the token is already void, so calling the logout
   * endpoint with it would only produce a second AUTH_* failure. The client
   * has already cleared storage by the time this runs.
   */
  const handleUnauthorized = useCallback(() => {
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(await authService.login(email, password));
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setSession(await authService.register(email, password));
  }, []);

  const signOut = useCallback(async () => {
    // The service clears local state in a `finally`, so a failed round trip
    // still signs the user out here. Being unable to reach the server is not a
    // reason to keep someone in a session they asked to leave.
    try {
      await authService.logout();
    } finally {
      setSession(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({session, restoring, signIn, signUp, signOut}),
    [session, restoring, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** The session context. Throws outside the provider rather than returning null. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
