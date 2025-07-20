/**
 * React renderer for Astro components
 * Re-exports the React renderer from the compiler package for consistency
 */

export {
  createReactRenderer,
  createSSRRenderer,
  createClientRenderer,
  type ReactRendererOptions,
  type RenderResult,
  type HydrationData,
  type ClientDirective,
} from '@minimal-astro/compiler/src/renderer/react.js';
