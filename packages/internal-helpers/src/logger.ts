/**
 * Structured logging utility for minimal-astro
 * Provides different log levels and environment-based filtering
 */

import {
  type LogContext,
  type LogEntry,
  LogLevel,
  type Logger,
  type LoggerOptions,
} from './logger-types.js';

/**
 * Create a logger instance with specified options
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  let currentLevel = options.level ?? getDefaultLogLevel();
  const prefix = options.prefix ?? '[minimal-astro]';
  const enableColors = options.enableColors ?? shouldEnableColors();
  const enableTimestamp = options.enableTimestamp ?? false;

  function formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    if (enableTimestamp) {
      parts.push(`[${new Date(entry.timestamp).toISOString()}]`);
    }

    if (prefix) {
      parts.push(prefix);
    }

    const levelName = LogLevel[entry.level];
    if (enableColors) {
      const coloredLevel = colorizeLevel(levelName, entry.level);
      parts.push(`[${coloredLevel}]`);
    } else {
      parts.push(`[${levelName}]`);
    }

    parts.push(entry.message);

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    return parts.join(' ');
  }

  function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      error,
    };

    const formatted = formatMessage(entry);

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        if (error) {
          console.error(error);
        }
        break;
    }
  }

  return {
    debug(message: string, context?: LogContext): void {
      log(LogLevel.DEBUG, message, context);
    },

    info(message: string, context?: LogContext): void {
      log(LogLevel.INFO, message, context);
    },

    warn(message: string, context?: LogContext): void {
      log(LogLevel.WARN, message, context);
    },

    error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
      if (errorOrContext instanceof Error) {
        log(LogLevel.ERROR, message, context, errorOrContext);
      } else {
        log(LogLevel.ERROR, message, errorOrContext);
      }
    },

    setLevel(newLevel: LogLevel): void {
      currentLevel = newLevel;
    },

    getLevel(): LogLevel {
      return currentLevel;
    },

    child(context: LogContext): Logger {
      return createContextualLogger(context, { ...options, level: currentLevel });
    },
  };
}

/**
 * Import pino logger for production builds
 */
import { createPinoLogger } from './pino-logger.js';

/**
 * Default logger instance for convenience
 * Uses pino in production for better performance
 */
export const logger: Logger =
  process.env.USE_PINO !== 'false' ? createPinoLogger() : createLogger();

/**
 * Get default log level from environment
 */
function getDefaultLogLevel(): LogLevel {
  const envLevel = process.env.ASTRO_LOG_LEVEL?.toUpperCase();
  switch (envLevel) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'SILENT':
      return LogLevel.SILENT;
    default:
      return process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
  }
}

/**
 * Check if colors should be enabled
 */
function shouldEnableColors(): boolean {
  if (typeof process === 'undefined') return false;
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return process.stdout?.isTTY ?? false;
}

/**
 * Add colors to log level names
 */
function colorizeLevel(levelName: string, level: LogLevel): string {
  const colors = {
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m', // Green
    [LogLevel.WARN]: '\x1b[33m', // Yellow
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.SILENT]: '\x1b[0m', // Reset
  };

  const reset = '\x1b[0m';
  const color = colors[level] ?? reset;

  return `${color}${levelName}${reset}`;
}

/**
 * Create a contextual logger with additional context
 */
export function createContextualLogger(baseContext: LogContext, options?: LoggerOptions): Logger {
  const baseLogger = createLogger(options);

  return {
    debug(message: string, context?: Record<string, unknown>): void {
      baseLogger.debug(message, { ...baseContext, ...context });
    },

    info(message: string, context?: Record<string, unknown>): void {
      baseLogger.info(message, { ...baseContext, ...context });
    },

    warn(message: string, context?: Record<string, unknown>): void {
      baseLogger.warn(message, { ...baseContext, ...context });
    },

    error(
      message: string,
      errorOrContext?: Error | Record<string, unknown>,
      context?: Record<string, unknown>
    ): void {
      if (errorOrContext instanceof Error) {
        baseLogger.error(message, errorOrContext, {
          ...baseContext,
          ...context,
        });
      } else {
        baseLogger.error(message, { ...baseContext, ...errorOrContext });
      }
    },

    setLevel(newLevel: LogLevel): void {
      baseLogger.setLevel(newLevel);
    },

    getLevel(): LogLevel {
      return baseLogger.getLevel();
    },

    child(context: LogContext): Logger {
      return createContextualLogger({ ...baseContext, ...context }, options);
    },
  };
}
