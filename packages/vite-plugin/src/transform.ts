/**
 * AST transformation utilities for .astro files
 *
 * This module handles the transformation of .astro source code
 * into JavaScript modules that can be processed by Vite.
 *
 * @module transform
 */

import { parse } from '@minimal-astro/compiler'
import type { AstroAST, AstroNode, ElementNode, FrontmatterNode } from '@minimal-astro/compiler'

/**
 * Helper to escape template literal special characters
 */
function escapeTemplate(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
}

/**
 * Converts an AST node to template literal code
 */
function nodeToTemplate(node: AstroNode): string {
  switch (node.type) {
    case 'Text':
      // Escape backticks and ${} in text content
      return escapeTemplate(node.value)

    case 'Expression':
      // Expression nodes contain JavaScript code to be interpolated
      return `\${escapeHtml(String(${node.value}))}`

    case 'Element':
      return elementToTemplate(node)

    case 'Program':
    case 'Template':
      return node.children.map(child => nodeToTemplate(child)).join('')

    case 'Frontmatter':
      // Frontmatter is handled separately
      return ''

    default:
      return ''
  }
}

/**
 * Converts an element node to template literal code
 */
function elementToTemplate(node: ElementNode): string {
  // Build attributes
  const attrs = node.attributes
    .map(attr => {
      if (typeof attr.value === 'string') {
        return ` ${attr.name}="${escapeTemplate(attr.value)}"`
      }
      // Expression attribute
      return ` ${attr.name}="\${escapeHtml(String(${attr.value.value}))}"`
    })
    .join('')

  if (node.selfClosing) {
    return `<${node.name}${attrs} />`
  }

  // Handle JSX-like expressions in children
  const children = node.children
    .map(child => {
      if (child.type === 'Expression') {
        // Check if expression looks like JSX (contains map with <)
        const expr = child.value
        if (expr.includes('.map') && expr.includes('<')) {
          // Transform JSX-like expressions to template strings
          // Extract the map callback and transform it
          const mapMatch = expr.match(/\.map\s*\(\s*(\w+)\s*=>\s*<(\w+)>([^<]*)<\/\2>\s*\)/)
          if (mapMatch) {
            const [, itemVar, tagName, content] = mapMatch
            const itemExpr = content.replace(
              new RegExp(`\\{${itemVar}\\}`, 'g'),
              `\${escapeHtml(String(${itemVar}))}`,
            )
            return `\${${expr.split('.map')[0]}.map(${itemVar} => \`<${tagName}>${itemExpr}</${tagName}>\`).join('')}`
          }
          // Fallback for other JSX patterns
          return `\${${expr}.join('')}`
        }
      }
      return nodeToTemplate(child)
    })
    .join('')

  return `<${node.name}${attrs}>${children}</${node.name}>`
}

/**
 * Extracts frontmatter code from AST
 */
function extractFrontmatter(ast: AstroAST): string {
  const frontmatterNode = ast.children.find(
    (node): node is FrontmatterNode => node.type === 'Frontmatter',
  )
  return frontmatterNode ? frontmatterNode.value.trim() : ''
}

/**
 * Transforms .astro source code into a JavaScript module for SSR
 *
 * This implementation:
 * 1. Parses the .astro file into an AST
 * 2. Extracts frontmatter code
 * 3. Converts the template to a template literal
 * 4. Returns a render function that executes frontmatter and returns HTML
 *
 * @param code - The .astro source code
 * @param id - The file path/id
 * @returns Transformed JavaScript code and optional source map
 */
export function transformAstro(code: string, id: string): { code: string; map: null } {
  // Skip if already transformed
  if (code.includes('// Transformed from:') && code.includes('export default function render()')) {
    return { code, map: null }
  }

  // Parse the .astro file into an AST
  const ast = parse(code)

  // Extract frontmatter
  const frontmatter = extractFrontmatter(ast)

  // Convert AST to template literal code
  const templateCode = nodeToTemplate(ast)

  // Generate the module code
  const transformedCode = `
// Transformed from: ${id}
import { escapeHtml } from '@minimal-astro/compiler';

export default function render() {
  ${frontmatter}
  
  return \`${templateCode}\`;
}
`

  return {
    code: transformedCode,
    map: null, // Source maps will be implemented later
  }
}
