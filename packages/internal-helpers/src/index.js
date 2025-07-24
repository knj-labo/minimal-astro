/**
 * Internal helpers for Minimal Astro packages
 * Shared utilities across the monorepo
 */
// Logger utilities
export { createLogger, createContextualLogger, logger } from './logger.js';
export { LogLevel } from './logger-types.js';
// Error boundary utilities
export {
  createErrorBoundary,
  globalErrorBoundary,
  withErrorBoundary,
  withAsyncErrorBoundary,
  safeExecute,
  safeExecuteAsync,
} from './error-boundary.js';
// Path utilities
export function isAbsolutePath(path) {
  return path.startsWith('/') || /^[a-zA-Z]:\\/.test(path);
}
export function normalizeSlashes(path) {
  return path.replace(/\\/g, '/');
}
// String utilities
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
// JSX Transform utilities
export { astToJSX } from './jsx-transform.js';
//# sourceMappingURL=index.js.map
