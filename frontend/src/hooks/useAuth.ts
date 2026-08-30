/** Access the authentication context. */

import type {AuthState, LoginRequest, RegisterRequest} from '@types/user';

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
  throw new Error('Not implemented');
}
