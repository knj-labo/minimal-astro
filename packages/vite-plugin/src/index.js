/**
 * Vite plugin for Minimal Astro
 * Re-exports the main plugin functionality
 */
export { astroVitePlugin as default } from './plugin.js';
export { astroVitePlugin } from './plugin.js';
export { transformAstroToJs, extractClientScript, hasClientDirectives } from './transform.js';
export { analyzeAstForHmr, handleAstroHmr, canHotReload, injectHmrCode } from './hmr.js';
//# sourceMappingURL=index.js.map
