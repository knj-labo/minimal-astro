/**
 * AST transformation utilities for .astro files
 *
 * This module handles the transformation of .astro source code
 * into JavaScript modules that can be processed by Vite.
 *
 * @module transform
 */

import { buildHTML, parse } from '@minimal-astro/compiler'

/**
 * Transforms .astro source code into a JavaScript module
 *
 * This is a temporary implementation that:
 * 1. Parses the .astro file into an AST
 * 2. Builds HTML from the AST
 * 3. Exports the HTML as a default export
 *
 * In a full implementation, this would handle:
 * - Component imports and exports
 * - Client-side hydration
 * - CSS extraction
 * - HMR support
 *
 * @param code - The .astro source code
 * @param id - The file path/id
 * @returns Transformed JavaScript code and optional source map
 */
export function transformAstro(code: string, _id: string): { code: string; map: null } {
  // Parse the .astro file into an AST
  const ast = parse(code)

  // Build HTML from the AST
  const html = buildHTML(ast)

  // For now, return a simple module that exports the HTML
  // This is a stub implementation that will be enhanced later
  const transformedCode = `export default ${JSON.stringify(html)};`

  return {
    code: transformedCode,
    map: null, // Source maps will be implemented later
  }
}
