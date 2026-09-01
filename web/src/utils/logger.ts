/**
 * Client-side logging in the project standard format:
 *
 *   [TIMESTAMP] [LEVEL] [CORRELATION_ID] [SERVICE] [MESSAGE] key=value …
 *
 * The same format the backend and the mobile app use, deliberately: one
 * correlation ID grepped across an API log and a browser console is what turns
 * "it failed at about two o'clock" into a single trace. That only works if all
 * three write the ID in the same place on the line.
 *
 * Every other module logs through here rather than calling `console` directly,
 * so the format, the level filter and the redaction rule all have one home.
 */

/* eslint-disable no-console -- this module *is* the console boundary. */

import {LOG_LEVELS, LOG_REDACTED_KEYS, MIN_LOG_LEVEL} from './constants';
import type {LogLevel} from './constants';
import {getCorrelationId} from './correlation';

/**
 * Whether a line at this level should be written.
 *
 * Below the configured floor nothing is formatted at all — the string
 * concatenation is skipped, not just the write — which matters for DEBUG lines
 * on a path that runs per WebSocket frame.
 */
function enabled(level: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(MIN_LOG_LEVEL);
}

function formatLine(level: LogLevel, service: string, message: string): string {
  return `[${new Date().toISOString()}] [${level}] [${getCorrelationId()}] [${service}] ${message}`;
}

/**
 * Render structured context as `key=value` pairs.
 *
 * Anything whose key looks like a credential is replaced rather than printed.
 * A browser console is copied into bug reports and screen-shared, and a JWT
 * that reaches it is a JWT that leaves the machine — so the guard lives here,
 * where it cannot be forgotten at a call site.
 */
function formatContext(context?: Record<string, unknown>): string {
  if (context === undefined) {
    return '';
  }

  const pairs = Object.entries(context).map(([key, value]) => {
    const redact = LOG_REDACTED_KEYS.some(marker => key.toLowerCase().includes(marker));
    return `${key}=${redact ? '[redacted]' : String(value)}`;
  });

  return pairs.length === 0 ? '' : ` ${pairs.join(' ')}`;
}

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => void;
}

/**
 * A logger bound to one service name.
 *
 * @param service - Shown in the `[SERVICE]` field. Use the module's own name
 *   ('api-client', 'status-socket') so a line can be traced back to a file.
 */
export function getLogger(service: string): Logger {
  return {
    debug: (message, context) => {
      if (enabled('DEBUG')) {
        console.log(formatLine('DEBUG', service, message) + formatContext(context));
      }
    },

    info: (message, context) => {
      if (enabled('INFO')) {
        console.log(formatLine('INFO', service, message) + formatContext(context));
      }
    },

    warn: (message, context) => {
      if (enabled('WARNING')) {
        console.warn(formatLine('WARNING', service, message) + formatContext(context));
      }
    },

    error: (message, error, context) => {
      if (!enabled('ERROR')) {
        return;
      }
      // The error object goes as a second argument rather than interpolated,
      // so the console keeps it inspectable and the stack survives.
      console.error(formatLine('ERROR', service, message) + formatContext(context), error ?? '');
    },
  };
}
