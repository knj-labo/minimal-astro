/**
 * Minimal Astro - A reimplemented Astro framework for educational purposes
 * Main package exports following the structure of withastro/astro
 */

// Core compiler exports
export { parseAstro, buildHtml, tokenize } from '@minimal-astro/compiler';

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
} from '@minimal-astro/renderer-react';
export {
  astToJSX,
  type JSXTransformOptions,
} from '@minimal-astro/internal-helpers';

// Content Collections exports
export {
  defineCollection,
  defineConfig,
  getCollection,
  getEntry,
  createContentManager,
  initializeContentAPI,
  getContentAPI,
  z,
  createSchemaValidator,
  validateContentEntry,
  loadContentModule,
  loadCollection,
  loadEntry,
  resolveContentPath,
} from '@minimal-astro/content';

// Utility exports
export {
  createContextualLogger,
  safeExecute,
  type LogLevel,
  type LogContext,
  type Logger,
} from '@minimal-astro/internal-helpers';

// Type exports
export type { ParseOptions, HtmlBuilderOptions } from '@minimal-astro/compiler';
