/**
 * Client-side logging in the project standard format:
 *
 *   [TIMESTAMP] [LEVEL] [CORRELATION_ID] [SERVICE] [MESSAGE]
 *
 * Matching the backend format means a session can be traced across both sides
 * by grepping one correlation ID.
 */

/* eslint-disable no-console -- this module *is* the console boundary; every
   other file logs through it rather than calling console directly. */

import {v4 as uuidv4} from 'uuid';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * One correlation ID per app session, not per request.
 *
 * The backend binds whatever arrives in X-Correlation-ID to its own context,
 * so a single value here ties every line the user's session produced on both
 * sides together.
 */
let correlationId: string | null = null;

/** Bind the session correlation ID that every subsequent log line carries. */
export function setCorrelationId(newCorrelationId: string): void {
  correlationId = newCorrelationId;
}

/** Return the current session correlation ID, generating one if unset. */
export function getCorrelationId(): string {
  if (correlationId === null) {
    correlationId = uuidv4();
  }
  return correlationId;
}

function formatLine(
  level: LogLevel,
  serviceName: string,
  message: string,
): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] [${getCorrelationId()}] [${serviceName}] ${message}`;
}

function formatContext(context?: Record<string, unknown>): string {
  if (context === undefined) {
    return '';
  }
  return ` ${Object.entries(context)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ')}`;
}

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: unknown) => void;
}

/**
 * Return a logger bound to one service name.
 *
 * @param serviceName - Component name shown in the `[SERVICE]` field.
 */
export function getLogger(serviceName: string): Logger {
  return {
    debug: (message, context) =>
      console.log(
        formatLine('DEBUG', serviceName, message) + formatContext(context),
      ),
    info: (message, context) =>
      console.log(
        formatLine('INFO', serviceName, message) + formatContext(context),
      ),
    warn: (message, context) =>
      console.warn(
        formatLine('WARNING', serviceName, message) + formatContext(context),
      ),
    error: (message, error): void => {
      // The error object goes as a second argument rather than interpolated:
      // React Native's console keeps the stack trace that way.
      console.error(formatLine('ERROR', serviceName, message), error ?? '');
    },
  };
}
