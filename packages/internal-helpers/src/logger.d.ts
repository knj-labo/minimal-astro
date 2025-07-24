/**
 * Structured logging utility for minimal-astro
 * Provides different log levels and environment-based filtering
 */
import { type LogContext, type Logger, type LoggerOptions } from './logger-types.js';
/**
 * Create a logger instance with specified options
 */
export declare function createLogger(options?: LoggerOptions): Logger;
/**
 * Default logger instance for convenience
 */
export declare const logger: Logger;
/**
 * Create a contextual logger with additional context
 */
export declare function createContextualLogger(baseContext: LogContext, options?: LoggerOptions): Logger;
//# sourceMappingURL=logger.d.ts.map