/**
 * Internal helpers for Minimal Astro packages
 * Shared utilities across the monorepo
 */
export { createLogger, createContextualLogger, logger } from './logger.js';
export { LogLevel } from './logger-types.js';
export type { LogContext, LogEntry, Logger, LoggerOptions } from './logger-types.js';
export { createErrorBoundary, globalErrorBoundary, withErrorBoundary, withAsyncErrorBoundary, safeExecute, safeExecuteAsync, } from './error-boundary.js';
export type { ErrorContext, RecoveryStrategy, ErrorBoundaryOptions, } from './error-boundary.js';
export declare function isAbsolutePath(path: string): boolean;
export declare function normalizeSlashes(path: string): string;
export declare function escapeHtml(str: string): string;
export declare function slugify(text: string): string;
export { astToJSX, type JSXTransformOptions, } from './jsx-transform.js';
export type { FrameworkType, UniversalSSROptions, UniversalSSRResult, FrameworkRenderer, } from './universal-ssr-types.js';
export type * from './types/ast.js';
//# sourceMappingURL=index.d.ts.map