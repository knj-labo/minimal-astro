/**
 * @minimal-astro/react - React integration for Minimal Astro
 */

// Main renderer exports
export {
  createReactRenderer,
  createSSRRenderer,
  createClientRenderer,
  type ReactRendererOptions,
  type RenderResult,
  type HydrationData,
  type ClientDirective,
} from './renderer.js';

// SSR specific exports
export {
  createReactSSRRenderer,
  renderReactComponent,
  type ReactSSROptions,
  type SSRResult as ReactSSRResult,
} from './ssr.js';
