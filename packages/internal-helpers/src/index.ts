/**
 * Internal helpers for Minimal Astro packages
 * Shared utilities across the monorepo
 */

// Logger utilities
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

export function createLogger(options: LoggerOptions = {}) {
  const { level = LogLevel.INFO, prefix = '' } = options;

  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      if (level <= LogLevel.DEBUG) {
        console.debug(`${prefix}[DEBUG] ${message}`, context);
      }
    },
    info: (message: string, context?: Record<string, unknown>) => {
      if (level <= LogLevel.INFO) {
        console.info(`${prefix}[INFO] ${message}`, context);
      }
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      if (level <= LogLevel.WARN) {
        console.warn(`${prefix}[WARN] ${message}`, context);
      }
    },
    error: (message: string, error?: Error, context?: Record<string, unknown>) => {
      if (level <= LogLevel.ERROR) {
        console.error(`${prefix}[ERROR] ${message}`, error, context);
      }
    },
  };
}

export function createContextualLogger(context: Record<string, unknown>) {
  return createLogger({ prefix: `[${JSON.stringify(context)}] ` });
}

// Path utilities
export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[a-zA-Z]:\\/.test(path);
}

export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, '/');
}

// String utilities
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
