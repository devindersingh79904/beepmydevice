/** Authentication API calls and token persistence. */

import type {
  AuthToken,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  NotificationPreferences,
  NotificationPreferencesUpdate,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from '@/types/user';
import {API_ROUTES, STORAGE_KEYS} from '@utils/constants';
import {getLogger} from '@utils/logger';
import {clearAll, getItem, setItem} from '@utils/storage';

import {get, post, put} from './api';

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

/** Replace the signed-in user's password. */
export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<void> {
  await put<ChangePasswordRequest, unknown>(
    API_ROUTES.CHANGE_PASSWORD,
    payload,
  );
  logger.info('Password changed');
}

/**
 * Ask for a password reset link.
 *
 * Resolves the same way whether or not the address has an account -- the
 * server deliberately does not say, and the UI must not either.
 */
export async function forgotPassword(email: string): Promise<void> {
  await post<ForgotPasswordRequest, unknown>(API_ROUTES.FORGOT_PASSWORD, {
    email,
  });
}

/** Consume a reset token and set a new password. */
export async function resetPassword(
  payload: ResetPasswordRequest,
): Promise<void> {
  await post<ResetPasswordRequest, unknown>(API_ROUTES.RESET_PASSWORD, payload);
}

/** Read the stored notification preferences. */
export async function getPreferences(): Promise<NotificationPreferences> {
  return get<NotificationPreferences>(API_ROUTES.PREFERENCES);
}

/** Write the toggles that changed, leaving the others alone. */
export async function updatePreferences(
  changes: NotificationPreferencesUpdate,
): Promise<NotificationPreferences> {
  return put<NotificationPreferencesUpdate, NotificationPreferences>(
    API_ROUTES.PREFERENCES,
    changes,
  );
}
