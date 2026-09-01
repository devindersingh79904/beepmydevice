/**
 * Authentication.
 *
 * A service owns the API shape and the token's lifetime; screens call these
 * and never touch the client or storage directly.
 */

import type {AuthToken, NotificationPreferences} from '@/types/models';
import type {Session} from '@/types/models';
import {API_ROUTES, STORAGE_KEYS} from '@/utils/constants';
import {get, post, put} from '@/utils/api-client';
import {getJson, removeItem, setItem, setJson} from '@/utils/storage';

/**
 * Persist the issued credentials.
 *
 * The email is stored alongside them because the API never returns it: login
 * answers with `user_id`, `token` and `expires_at` only, and the sidebar has
 * to address the user somehow. It is display text and nothing more — no
 * decision anywhere reads it.
 */
function storeSession(token: AuthToken, email: string): Session {
  const session: Session = {
    user_id: token.user_id,
    email,
    expires_at: token.expires_at,
  };
  setItem(STORAGE_KEYS.AUTH_TOKEN, token.token);
  setJson(STORAGE_KEYS.SESSION, session);
  return session;
}

/** Forget everything about the signed-in user. */
export function clearSession(): void {
  removeItem(STORAGE_KEYS.AUTH_TOKEN);
  removeItem(STORAGE_KEYS.SESSION);
}

/**
 * The stored session, if there is a usable one.
 *
 * The expiry is checked locally as a courtesy, so a user who left the tab open
 * overnight sees the sign-in screen rather than a screenful of failed
 * requests. It is not a security check — the server validates every token on
 * every request, and a client-side clock is not evidence of anything.
 */
export function restoreSession(): Session | null {
  const session = getJson<Session>(STORAGE_KEYS.SESSION);
  if (session === null) {
    return null;
  }

  const expiry = Date.parse(session.expires_at);
  if (!Number.isNaN(expiry) && expiry <= Date.now()) {
    clearSession();
    return null;
  }

  return session;
}

/** Sign in and store the issued token. */
export async function login(email: string, password: string): Promise<Session> {
  const token = await post<AuthToken>(API_ROUTES.LOGIN, {email, password});
  return storeSession(token, email);
}

/** Create an account. The backend signs the new user in and returns a token. */
export async function register(email: string, password: string): Promise<Session> {
  const token = await post<AuthToken>(API_ROUTES.REGISTER, {email, password});
  return storeSession(token, email);
}

/**
 * Sign out.
 *
 * The server call adds the token to its revocation list, which is what makes
 * a stolen token useless before it expires. The local session is cleared
 * regardless of how that call goes: a failed logout must not strand someone in
 * a session they have asked to leave.
 */
export async function logout(): Promise<void> {
  try {
    await post(API_ROUTES.LOGOUT);
  } finally {
    clearSession();
  }
}

/** Change the password. The current one is required, so a stolen token alone cannot lock the owner out. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await put(API_ROUTES.CHANGE_PASSWORD, {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

/**
 * Begin a password reset.
 *
 * The endpoint answers identically for an address it does not know, so this
 * cannot be used to discover which emails have accounts. The UI must not
 * report whether the address was found either.
 */
export async function forgotPassword(email: string): Promise<void> {
  await post(API_ROUTES.FORGOT_PASSWORD, {email});
}

/** Read the notification preferences. */
export async function getPreferences(): Promise<NotificationPreferences> {
  return get<NotificationPreferences>(API_ROUTES.PREFERENCES);
}

/**
 * Update notification preferences.
 *
 * Partial by design: send only the toggle that changed, and omitted fields
 * keep their stored value. These are enforced server-side — a device whose
 * owner disabled notifications is not pushed to, whatever the UI shows.
 */
export async function updatePreferences(
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return put<NotificationPreferences>(API_ROUTES.PREFERENCES, patch);
}
