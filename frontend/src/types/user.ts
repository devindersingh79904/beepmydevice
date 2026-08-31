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
 * the user flipped; the server always returns all three.
 */
export interface NotificationPreferences {
  notifications_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
}

export type NotificationPreferencesUpdate = Partial<NotificationPreferences>;
