/**
 * Vite plugin for transforming .astro files
 *
 * This plugin enables Vite to process .astro files by transforming
 * them into JavaScript modules that can be imported and rendered.
 *
 * @module vite-plugin-astro
 */

import { createFilter } from '@rollup/pluginutils'
import type { Plugin } from 'vite'
import { transformAstro } from './transform.js'

/**
 * Creates a Vite plugin for processing .astro files
 *
 * This plugin:
 * - Intercepts .astro file imports
 * - Transforms them into JavaScript modules
 * - Enables HMR support (future enhancement)
 * - Handles CSS extraction (future enhancement)
 *
 * @returns Vite plugin configuration
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import { vitePluginAstro } from '@minimal-astro/vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [vitePluginAstro()]
 * })
 * ```
 */
export function vitePluginAstro(): Plugin {
  // Create a filter to match .astro files
  const filter = createFilter('**/*.astro')

  return {
    name: 'vite-plugin-astro',

    // Run before other plugins to ensure .astro files are transformed first
    enforce: 'pre',

    /**
     * Transform hook for processing .astro files
     */
    transform(code: string, id: string) {
      // Only process .astro files
      if (!filter(id)) {
        return null
      }

      // Check if it's an .astro file by extension as well
      if (!id.endsWith('.astro')) {
        return null
      }

      // Transform the .astro file
      return transformAstro(code, id)
    },

    /**
     * Configure server to handle .astro files
     */
    configureServer(server) {
      // Add .astro to the list of extensions that trigger full page reload
      // This is temporary until proper HMR is implemented
      server.watcher.on('change', file => {
        if (file.endsWith('.astro')) {
          server.ws.send({
            type: 'full-reload',
          })
        }
      })
    },
  }
}

// Default export for convenience
export default vitePluginAstro
