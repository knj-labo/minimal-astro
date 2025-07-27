/**
 * Internal helpers for Minimal Astro packages
 * Shared utilities across the monorepo
 */

// Logger utilities
export { createLogger, createContextualLogger, logger } from './logger.js';
export { LogLevel } from './logger-types.js';
export type { LogContext, LogEntry, Logger, LoggerOptions } from './logger-types.js';

// Error boundary utilities
export {
  createErrorBoundary,
  globalErrorBoundary,
  withErrorBoundary,
  withAsyncErrorBoundary,
  safeExecute,
  safeExecuteAsync,
} from './error-boundary.js';
export type {
  ErrorContext,
  RecoveryStrategy,
  ErrorBoundaryOptions,
} from './error-boundary.js';

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

// JSX Transform utilities
export {
  astToJSX,
  type JSXTransformOptions,
} from './jsx-transform.js';

// Expression evaluator
export {
  evaluateExpression,
  extractVariables,
  type EvaluatorContext,
} from './expression-evaluator.js';

// Universal SSR types
export type {
  FrameworkType,
  UniversalSSROptions,
  UniversalSSRResult,
  FrameworkRenderer,
} from './universal-ssr-types.js';

// AST type exports
export type * from './types/ast.js';
