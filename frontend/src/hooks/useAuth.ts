/** Access the authentication context. */

import {useContext} from 'react';

import {AuthContext} from '@context/AuthContext';
import type {AuthState, LoginRequest, RegisterRequest} from '@/types/user';

export interface UseAuthResult extends AuthState {
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Return auth state and actions.
 *
 * @throws If called outside an AuthProvider.
 */
export function useAuth(): UseAuthResult {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
