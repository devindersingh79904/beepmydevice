/** Authentication API calls and token persistence. */

import type {
  AuthToken,
  LoginRequest,
  RegisterRequest,
  User,
} from '@/types/user';
import {API_ROUTES, STORAGE_KEYS} from '@utils/constants';
import {getLogger} from '@utils/logger';
import {clearAll, getItem, setItem} from '@utils/storage';

import {post} from './api';

const logger = getLogger('auth-service');

/** Persist the credentials the server issued, so the next launch resumes. */
async function persist(token: AuthToken, email: string): Promise<void> {
  await setItem(STORAGE_KEYS.AUTH_TOKEN, token.token);
  await setItem<User>(STORAGE_KEYS.USER, {
    user_id: token.user_id,
    email,
    // The token response carries no created_at; the account was created now
    // for a registration, and this is only used for display.
    created_at: new Date().toISOString(),
  });
}

/** Register an account, persist the returned token, and return the user. */
export async function register(payload: RegisterRequest): Promise<AuthToken> {
  const token = await post<RegisterRequest, AuthToken>(
    API_ROUTES.REGISTER,
    payload,
  );
  await persist(token, payload.email);
  logger.info('Registered and signed in');
  return token;
}

/** Log in, persist the returned token, and return it. */
export async function login(payload: LoginRequest): Promise<AuthToken> {
  const token = await post<LoginRequest, AuthToken>(API_ROUTES.LOGIN, payload);
  await persist(token, payload.email);
  logger.info('Signed in');
  return token;
}

/**
 * Log out.
 *
 * Local storage is cleared even if the network call fails -- the user must end
 * up logged out on this device regardless of whether the server was reachable.
 */
export async function logout(): Promise<void> {
  try {
    await post<Record<string, never>, unknown>(API_ROUTES.LOGOUT, {});
  } catch (error) {
    logger.warn('Logout call failed; clearing local session anyway');
  } finally {
    await clearAll();
  }
}

/** Return the persisted token, or null when not signed in. */
export async function getStoredToken(): Promise<string | null> {
  return getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
}

/** Return the persisted user, or null when not signed in. */
export async function getStoredUser(): Promise<User | null> {
  return getItem<User>(STORAGE_KEYS.USER);
}
