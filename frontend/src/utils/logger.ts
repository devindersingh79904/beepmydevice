/**
 * Client-side logging in the project standard format:
 *
 *   [TIMESTAMP] [LEVEL] [CORRELATION_ID] [SERVICE] [MESSAGE]
 *
 * Matching the backend format means a session can be traced across both sides
 * by grepping one correlation ID.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/** Bind the session correlation ID that every subsequent log line carries. */
export function setCorrelationId(correlationId: string): void {
  throw new Error('Not implemented');
}

/** Return the current session correlation ID, generating one if unset. */
export function getCorrelationId(): string {
  throw new Error('Not implemented');
}

/**
 * Return a logger bound to one service name.
 *
 * @param serviceName - Component name shown in the `[SERVICE]` field.
 */
export function getLogger(serviceName: string): {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: unknown) => void;
} {
  throw new Error('Not implemented');
}
