/**
 * Authentication provider.
 *
 * Restores any persisted session on mount so a returning user lands on the
 * dashboard rather than the login screen.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  AuthState,
  LoginRequest,
  RegisterRequest,
  User,
} from '@/types/user';
import * as authService from '@services/auth';
import {isApiErrorArray} from '@services/api';
import * as notificationService from '@services/notification';
import {setUnauthorizedHandler} from '@utils/api-client';
import {getLogger} from '@utils/logger';

import {ErrorContext} from './ErrorContext';

const logger = getLogger('auth-context');

export interface AuthContextValue extends AuthState {
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({children}: AuthProviderProps): React.JSX.Element {
  const errorContext = useContext(ErrorContext);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  /** Drop local session state. Storage is cleared by the caller. */
  const forgetSession = useCallback((): void => {
    setUser(null);
    setToken(null);
    notificationService.stopListening();
  }, []);

  // Restore a persisted session before the first render decides which stack to
  // show, so a signed-in user never sees the login screen flash past.
  useEffect(() => {
    const restore = async (): Promise<void> => {
      const [storedToken, storedUser] = await Promise.all([
        authService.getStoredToken(),
        authService.getStoredUser(),
      ]);
      setToken(storedToken);
      setUser(storedUser);
      setLoading(false);
    };
    restore().catch(error => {
      // Never leave the splash up: an unreadable session is a signed-out one.
      logger.error('Could not restore the session', error);
      setLoading(false);
    });
  }, []);

  // The api-client tears down storage on any AUTH_* code; this mirrors that
  // into React state so the navigator swaps stacks in the same beat.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logger.warn('Session rejected by the server; signing out');
      forgetSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [forgetSession]);

  /** Run an auth call, routing any ApiError[] to the error context. */
  const attempt = useCallback(
    async (action: () => Promise<void>): Promise<void> => {
      try {
        await action();
      } catch (error) {
        if (isApiErrorArray(error)) {
          errorContext?.showErrors(error);
          return;
        }
        throw error;
      }
    },
    [errorContext],
  );

  const login = useCallback(
    (payload: LoginRequest): Promise<void> =>
      attempt(async () => {
        const issued = await authService.login(payload);
        setToken(issued.token);
        setUser(await authService.getStoredUser());
      }),
    [attempt],
  );

  const register = useCallback(
    (payload: RegisterRequest): Promise<void> =>
      attempt(async () => {
        const issued = await authService.register(payload);
        setToken(issued.token);
        setUser(await authService.getStoredUser());
      }),
    [attempt],
  );

  const logout = useCallback(async (): Promise<void> => {
    // Local state is cleared regardless of what the server said: the user
    // asked to be signed out on this device.
    await authService.logout();
    forgetSession();
  }, [forgetSession]);

  const value = useMemo(
    (): AuthContextValue => ({
      user,
      token,
      isAuthenticated: token !== null,
      isLoading,
      login,
      register,
      logout,
    }),
    [isLoading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
