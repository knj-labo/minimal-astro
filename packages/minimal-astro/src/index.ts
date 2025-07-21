/**
 * Minimal Astro - A reimplemented Astro framework for educational purposes
 * Main package exports following the structure of withastro/astro
 */

// Core compiler exports
export { parseAstro } from './core/parse.js';
export {
  buildHtml,
  buildHtmlToStream,
  createStreamingHtmlBuilder,
} from './core/html-builder.js';
export { tokenize } from './core/tokenizer.js';

// Renderer exports
export {
  createReactRenderer,
  createSSRRenderer,
  createClientRenderer,
  type ReactRendererOptions,
  type RenderResult,
  type HydrationData,
  type ClientDirective,
} from './core/renderer/react.js';
export {
  createJSXTransformer,
  astToJSX,
  astToReactComponent,
  type JSXTransformOptions,
} from './core/renderer/jsx-transform.js';

// Content Collections exports
export {
  createContentManager,
  initializeContentAPI,
  getContentAPI,
  collections,
  queries,
  type ContentManagerOptions,
} from './core/content/api.js';
export {
  createSchemaValidator,
  validateContentEntry,
  z,
  type ValidationResult,
  type ValidationError,
} from './core/content/schema.js';
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
} from './core/content/loader.js';

// Utility exports
export {
  createLogger,
  createContextualLogger,
  logger,
  LogLevel,
  type LogEntry,
  type LoggerOptions,
} from './core/utils/logger.js';

// Type exports
export type { ParseOptions } from './core/parse.js';
export type {
  HtmlBuilderOptions,
  StreamingOptions,
} from './core/html-builder.js';
