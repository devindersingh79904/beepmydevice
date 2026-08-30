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
