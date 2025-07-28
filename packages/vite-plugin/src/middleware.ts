/**
 * SSR middleware for serving .astro pages
 *
 * This module handles HTTP requests and serves rendered .astro pages
 * by resolving file paths, loading modules, and executing render functions.
 *
 * @module middleware
 */

import { existsSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import type { ViteDevServer } from 'vite'

/**
 * Maps URL paths to .astro file paths
 *
 * @param url - The requested URL path
 * @param root - The project root directory
 * @returns The resolved file path or null if not found
 */
export function resolveAstroFile(url: string, root: string): string | null {
  // Remove query string and hash
  const cleanUrl = url.split('?')[0].split('#')[0]

  // Handle root path
  if (cleanUrl === '/' || cleanUrl === '') {
    const indexPath = join(root, 'src/pages/index.astro')
    return existsSync(indexPath) ? indexPath : null
  }

  // Remove leading slash and add .astro extension if needed
  const urlPath = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl
  const astroPath = urlPath.endsWith('.astro') ? urlPath : `${urlPath}.astro`

  // Try to find the file in src/pages
  const filePath = join(root, 'src/pages', astroPath)
  return existsSync(filePath) ? filePath : null
}

/**
 * Creates SSR middleware for handling .astro page requests
 *
 * @param server - The Vite dev server instance
 * @returns Middleware function
 */
export function createAstroMiddleware(server: ViteDevServer) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    // Only handle GET requests
    if (req.method !== 'GET') {
      return next()
    }

    const url = req.url || '/'

    // Skip Vite internal requests
    if (url.startsWith('/@') || url.includes('__vite')) {
      return next()
    }

    // Skip non-page requests (assets, etc.) except .astro files
    if (url.includes('.') && !url.endsWith('.astro') && !url.endsWith('/')) {
      return next()
    }

    // Resolve the .astro file path
    const filePath = resolveAstroFile(url, server.config.root)

    if (!filePath) {
      // No matching .astro file found
      return next()
    }

    try {
      // Load the module through Vite's SSR pipeline
      const module = await server.ssrLoadModule(filePath)

      // Check if the module has a default export (render function)
      if (typeof module.default !== 'function') {
        throw new Error(`Module ${filePath} does not export a render function`)
      }

      // Execute the render function
      const html = await module.default()

      // Send the response
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(html)
    } catch (error) {
      // Log the error
      console.error(`Error rendering ${filePath}:`, error)

      // Send error response
      res.statusCode = 500
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error</title>
            <style>
              body { font-family: sans-serif; padding: 2rem; }
              pre { background: #f0f0f0; padding: 1rem; overflow: auto; }
            </style>
          </head>
          <body>
            <h1>Error rendering page</h1>
            <p>Failed to render ${filePath}</p>
            <pre>${error instanceof Error ? error.stack : String(error)}</pre>
          </body>
        </html>
      `)
    }
  }
}
