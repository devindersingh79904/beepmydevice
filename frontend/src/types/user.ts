/** Types for accounts and authentication. */

export interface User {
  user_id: string;
  email: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

/** Credentials returned by register and login. */
export interface AuthToken {
  user_id: string;
  token: string;
  token_type: string;
  expires_at: string;
}

/** Shape exposed by AuthContext. */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

/**
 * Notification settings.
 *
 * Every field is optional on the way *in* so a client can send only the toggle
 * the user flipped; the server always returns all four.
 */
export interface NotificationPreferences {
  notifications_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  /**
   * Whether an alert should be audible on a phone whose ringer is silenced.
   *
   * Read by the *server*, not here: it picks the Android notification channel
   * the push is posted to, and a channel's audio behaviour is fixed when the
   * system creates it. That is why this cannot be decided on the phone at the
   * moment an alert arrives -- by then the app is usually not running at all.
   */
  alert_on_silent: boolean;
}

export type NotificationPreferencesUpdate = Partial<NotificationPreferences>;
