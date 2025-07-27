/**
 * Pino-based structured logging utility for minimal-astro
 * Production-ready logger with better performance and features
 */

import pino from 'pino';
import type { LoggerOptions as PinoOptions } from 'pino';
import { type LogContext, LogLevel, type Logger, type LoggerOptions } from './logger-types.js';

/**
 * Map our log levels to pino levels
 */
const levelMap = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
  [LogLevel.SILENT]: 'silent',
} as const;

/**
 * Create development transport with pretty printing
 */
function createDevTransport(): PinoOptions['transport'] {
  // In development, use default console output
  return undefined;
}

/**
 * Create production transport (JSON output)
 */
function createProdTransport(): PinoOptions['transport'] {
  return undefined; // Use default stdout in production
}

/**
 * Convert our LogLevel to pino level
 */
function getPinoLevel(level: LogLevel): string {
  const envLevel = process.env.ASTRO_LOG_LEVEL?.toUpperCase();
  if (envLevel && envLevel in LogLevel) {
    return levelMap[LogLevel[envLevel as keyof typeof LogLevel]];
  }
  return levelMap[level] || 'info';
}

/**
 * Create a pino-based logger instance
 */
export function createPinoLogger(options: LoggerOptions = {}): Logger {
  const isDev = process.env.NODE_ENV === 'development';
  const defaultLevel = isDev ? LogLevel.DEBUG : LogLevel.INFO;

  const pinoOptions: PinoOptions = {
    level: getPinoLevel(options.level ?? defaultLevel),
    base: {
      prefix: options.prefix ?? 'minimal-astro',
    },
    transport: isDev ? createDevTransport() : createProdTransport(),
    // Remove console.log statements in production builds
    browser: {
      write: process.env.NODE_ENV === 'production' ? {} : undefined,
    },
  };

  const pinoLogger = pino(pinoOptions);

  return {
    debug(message: string, context?: LogContext): void {
      if (context) {
        pinoLogger.debug(context, message);
      } else {
        pinoLogger.debug(message);
      }
    },

    info(message: string, context?: LogContext): void {
      if (context) {
        pinoLogger.info(context, message);
      } else {
        pinoLogger.info(message);
      }
    },

    warn(message: string, context?: LogContext): void {
      if (context) {
        pinoLogger.warn(context, message);
      } else {
        pinoLogger.warn(message);
      }
    },

    error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
      if (errorOrContext instanceof Error) {
        pinoLogger.error({ err: errorOrContext, ...context }, message);
      } else if (errorOrContext) {
        pinoLogger.error(errorOrContext, message);
      } else {
        pinoLogger.error(message);
      }
    },

    setLevel(newLevel: LogLevel): void {
      pinoLogger.level = levelMap[newLevel];
    },

    getLevel(): LogLevel {
      // Reverse lookup pino level to our LogLevel
      const pinoLevel = pinoLogger.level;
      for (const [key, value] of Object.entries(levelMap)) {
        if (value === pinoLevel) {
          return Number(key) as LogLevel;
        }
      }
      return LogLevel.INFO;
    },

    child(context: LogContext): Logger {
      const childPino = pinoLogger.child(context);
      return createLoggerFromPino(childPino);
    },
  };
}

/**
 * Create a Logger wrapper from existing pino instance
 */
function createLoggerFromPino(pinoInstance: pino.Logger): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      if (context) {
        pinoInstance.debug(context, message);
      } else {
        pinoInstance.debug(message);
      }
    },

    info(message: string, context?: LogContext): void {
      if (context) {
        pinoInstance.info(context, message);
      } else {
        pinoInstance.info(message);
      }
    },

    warn(message: string, context?: LogContext): void {
      if (context) {
        pinoInstance.warn(context, message);
      } else {
        pinoInstance.warn(message);
      }
    },

    error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
      if (errorOrContext instanceof Error) {
        pinoInstance.error({ err: errorOrContext, ...context }, message);
      } else if (errorOrContext) {
        pinoInstance.error(errorOrContext, message);
      } else {
        pinoInstance.error(message);
      }
    },

    setLevel(newLevel: LogLevel): void {
      pinoInstance.level = levelMap[newLevel];
    },

    getLevel(): LogLevel {
      const pinoLevel = pinoInstance.level;
      for (const [key, value] of Object.entries(levelMap)) {
        if (value === pinoLevel) {
          return Number(key) as LogLevel;
        }
      }
      return LogLevel.INFO;
    },

    child(context: LogContext): Logger {
      const childPino = pinoInstance.child(context);
      return createLoggerFromPino(childPino);
    },
  };
}
