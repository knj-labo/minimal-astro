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
     * Disable index.html handling
     */
    config() {
      return {
        appType: 'custom',
      }
    },

    /**
     * Resolve .astro file imports
     */
    async resolveId(id: string, importer?: string) {
      // Handle .astro imports
      if (id.endsWith('.astro')) {
        const path = await import('node:path')

        // If it's already an absolute path, return it
        if (path.isAbsolute(id)) {
          return id
        }

        // Resolve relative imports
        if (importer) {
          return path.resolve(path.dirname(importer), id)
        }

        // For entry points, resolve from root
        return path.resolve(id)
      }
      return null
    },

    /**
     * Load .astro files
     */
    async load(id: string) {
      if (!id.endsWith('.astro')) {
        return null
      }

      // Read the file
      const { readFileSync } = await import('node:fs')
      const code = readFileSync(id, 'utf-8')
      return code
    },

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
    async configureServer(server) {
      // Import middleware
      const { createAstroMiddleware } = await import('./middleware.js')

      // Return a function that adds our middleware
      // This ensures it runs before Vite's built-in middleware
      return () => {
        server.middlewares.use(createAstroMiddleware(server))
      }
    },

    /**
     * Configure HMR
     */
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.astro')) {
        // Trigger full page reload for .astro files
        server.ws.send({
          type: 'full-reload',
        })
      }
    },
  }
}

// Default export for convenience
export default vitePluginAstro
