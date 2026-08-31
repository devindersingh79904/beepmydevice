/**
 * Authentication provider.
 *
 * Restores any persisted session on mount so a returning user lands on the
 * dashboard rather than the login screen.
 */

import React, {createContext, type ReactNode} from 'react';

import type {AuthState, LoginRequest, RegisterRequest} from '@/types/user';

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

export function AuthProvider({
  children: _children,
}: AuthProviderProps): React.JSX.Element {
  throw new Error('Not implemented');
}
