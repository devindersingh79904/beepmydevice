/** Authentication API calls and token persistence. */

import type {AuthToken, LoginRequest, RegisterRequest, User} from '@types/user';

/** Register an account, persist the returned token, and return the user. */
export async function register(payload: RegisterRequest): Promise<AuthToken> {
  throw new Error('Not implemented');
}

/** Log in, persist the returned token, and return it. */
export async function login(payload: LoginRequest): Promise<AuthToken> {
  throw new Error('Not implemented');
}

/**
 * Log out.
 *
 * Local storage is cleared even if the network call fails -- the user must end
 * up logged out on this device regardless of whether the server was reachable.
 */
export async function logout(): Promise<void> {
  throw new Error('Not implemented');
}

/** Return the persisted token, or null when not signed in. */
export async function getStoredToken(): Promise<string | null> {
  throw new Error('Not implemented');
}

/** Return the persisted user, or null when not signed in. */
export async function getStoredUser(): Promise<User | null> {
  throw new Error('Not implemented');
}
