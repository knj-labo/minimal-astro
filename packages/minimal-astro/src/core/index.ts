// Main compiler exports
export { parseAstro } from './parse.js';
export {
  buildHtml,
  buildHtmlToStream,
  createStreamingHtmlBuilder,
} from './html-builder.js';
export { tokenize } from './tokenizer.js';
export { build } from '../cli/build.js';
export { dev } from '../cli/dev.js';

// Utility exports (removed duplicate, see below)

// Vite plugin exports
export { astroVitePlugin } from '../vite-plugin-astro/plugin.js';
export {
  transformAstroToJs,
  extractClientScript,
  hasClientDirectives,
} from '../vite-plugin-astro/transform.js';
export {
  analyzeAstForHmr,
  handleAstroHmr,
  canHotReload,
  injectHmrCode,
} from '../vite-plugin-astro/hmr.js';

// Renderer exports
// Re-export from integration packages
export {
  createReactRenderer,
  createSSRRenderer,
  createClientRenderer,
  type ReactRendererOptions,
  type RenderResult,
  type HydrationData,
  type ClientDirective,
} from '@minimal-astro/react';
export {
  astToJSX,
  type JSXTransformOptions,
} from '@minimal-astro/internal-helpers';

// Runtime exports - moved to @minimal-astro/runtime package
// import { createHydrationRuntime, autoHydrate, hydrate } from '@minimal-astro/runtime';

// Content Collections exports
export {
  createContentManager,
  initializeContentAPI,
  getContentAPI,
  collections,
  queries,
  type ContentManagerOptions,
} from './content/api.js';
export {
  createSchemaValidator,
  validateContentEntry,
  z,
  type ValidationResult,
  type ValidationError,
} from './content/schema.js';
export {
  createMarkdownLoader,
  createJsonLoader,
  createYamlLoader,
  createAutoLoader,
  parseFrontmatter,
  generateSlug,
  extractHeadings,
  calculateReadingTime,
  type LoaderOptions,
  type MarkdownRenderer,
} from './content/loader.js';
export type {
  ContentConfig,
  CollectionConfig,
  Schema,
  ContentEntry,
  ContentRenderResult,
  Heading,
  ReadingTime,
  ContentLoader,
  ContentTransformer,
  ContentQuery,
  ContentAPI,
} from './content/types.js';

// Performance utilities
export {
  createObjectPool,
  positionPool,
  sourceSpanPool,
  attributePool,
  arrayPool,
  createStringPool,
  globalStringPool,
  getPoolStats,
  clearAllPools,
} from './utils/object-pool.js';
export {
  benchmark,
  compare,
  createBenchmarkSuite,
  createMemoryTracker,
  createRegressionDetector,
  formatResults,
  quickBench,
  measureTime,
  measureTimeAsync,
} from './utils/benchmark.js';
export {
  createLazyError,
  createLazyParseError,
  createLazyTransformError,
  createLazyParseErrorWithContext,
  createLazyTransformErrorWithContext,
  createErrorAggregator,
  ErrorFactories,
} from './utils/lazy-error.js';
export {
  createErrorBoundary,
  globalErrorBoundary,
  safeExecute,
  safeExecuteAsync,
  withErrorBoundary,
  withAsyncErrorBoundary,
  type ErrorContext,
  type RecoveryStrategy,
  type ErrorBoundaryOptions,
} from './utils/error-boundary.js';
export {
  enhanceError,
  generateCodeFrame,
  formatEnhancedError,
  createDevErrorHandler,
  validateDevelopmentSetup,
  getPerformanceHints,
  collectDebugInfo,
  withDevEnhancements,
  type ErrorEnhancement,
  type CodeContext,
} from './utils/dev-experience.js';
export {
  createLogger,
  createContextualLogger,
  logger,
  LogLevel,
  type LogEntry,
  type LoggerOptions,
} from './utils/logger.js';
export {
  createPerformanceMonitor,
  globalPerformanceMonitor,
  timed,
  timedAsync,
  withTiming,
  withAsyncTiming,
  createPerformanceBudget,
  trackMemoryUsage,
  type PerformanceMetric,
  type PerformanceReport,
} from './utils/performance-monitor.js';

// Type exports
export type * from '../types/ast.js';
export type { ParseOptions } from './parse.js';
export type { HtmlBuilderOptions, StreamingOptions } from './html-builder.js';
export type { BuildOptions } from '../cli/build.js';
export type { DevOptions } from '../cli/dev.js';
export type { AstroVitePluginOptions } from '../vite-plugin-astro/plugin.js';
export type { TransformOptions } from '../vite-plugin-astro/transform.js';
export type { HmrUpdateContext, AstroHmrState } from '../vite-plugin-astro/hmr.js';
