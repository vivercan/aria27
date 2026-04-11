/**
 * Client-side logger for browser environments.
 * Works without Node.js APIs.
 *
 * In development: logs to console with tag prefix
 * In production: suppresses info/warn, keeps errors
 */

interface LoggerMethods {
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

export function clientLogger(tag: string): LoggerMethods {
  const isDev = process.env.NODE_ENV !== "production";
  const prefix = `[${tag}]`;

  return {
    info: (message: string, data?: unknown) => {
      if (isDev) {
        console.log(prefix, message, data);
      }
    },
    warn: (message: string, data?: unknown) => {
      if (isDev) {
        console.warn(prefix, message, data);
      }
    },
    error: (message: string, data?: unknown) => {
      // Errors always log, even in production
      console.error(prefix, message, data);
    },
  };
}
