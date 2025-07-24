/**
 * Structured logging utility for minimal-astro
 * Provides different log levels and environment-based filtering
 */
import { LogLevel } from './logger-types.js';
/**
 * Create a logger instance with specified options
 */
export function createLogger(options = {}) {
  let currentLevel = options.level ?? getDefaultLogLevel();
  const prefix = options.prefix ?? '[minimal-astro]';
  const enableColors = options.enableColors ?? shouldEnableColors();
  const enableTimestamp = options.enableTimestamp ?? false;
  function formatMessage(entry) {
    const parts = [];
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
  function log(level, message, context, error) {
    const entry = {
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
    debug(message, context) {
      log(LogLevel.DEBUG, message, context);
    },
    info(message, context) {
      log(LogLevel.INFO, message, context);
    },
    warn(message, context) {
      log(LogLevel.WARN, message, context);
    },
    error(message, errorOrContext, context) {
      if (errorOrContext instanceof Error) {
        log(LogLevel.ERROR, message, context, errorOrContext);
      } else {
        log(LogLevel.ERROR, message, errorOrContext);
      }
    },
    setLevel(newLevel) {
      currentLevel = newLevel;
    },
    getLevel() {
      return currentLevel;
    },
    child(context) {
      return createContextualLogger(context, { ...options, level: currentLevel });
    },
  };
}
/**
 * Default logger instance for convenience
 */
export const logger = createLogger();
/**
 * Get default log level from environment
 */
function getDefaultLogLevel() {
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
function shouldEnableColors() {
  if (typeof process === 'undefined') return false;
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return process.stdout?.isTTY ?? false;
}
/**
 * Add colors to log level names
 */
function colorizeLevel(levelName, level) {
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
export function createContextualLogger(baseContext, options) {
  const baseLogger = createLogger(options);
  return {
    debug(message, context) {
      baseLogger.debug(message, { ...baseContext, ...context });
    },
    info(message, context) {
      baseLogger.info(message, { ...baseContext, ...context });
    },
    warn(message, context) {
      baseLogger.warn(message, { ...baseContext, ...context });
    },
    error(message, errorOrContext, context) {
      if (errorOrContext instanceof Error) {
        baseLogger.error(message, errorOrContext, {
          ...baseContext,
          ...context,
        });
      } else {
        baseLogger.error(message, { ...baseContext, ...errorOrContext });
      }
    },
    setLevel(newLevel) {
      baseLogger.setLevel(newLevel);
    },
    getLevel() {
      return baseLogger.getLevel();
    },
    child(context) {
      return createContextualLogger({ ...baseContext, ...context }, options);
    },
  };
}
//# sourceMappingURL=logger.js.map
