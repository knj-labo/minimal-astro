/**
 * AST to HTML builder
 *
 * This module provides the main entry point for converting
 * an Astro AST into an HTML string.
 *
 * @module builder
 */

import type { AstroAST, AstroNode } from '../parser/ast.js'
import { serializeElement, serializeText } from './serializer.js'

/**
 * Set of HTML void elements that are self-closing
 */
const VOID_ELEMENTS = new Set([
  'img',
  'br',
  'hr',
  'input',
  'area',
  'base',
  'col',
  'embed',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])

/**
 * Checks if an element is a void element
 */
function isVoidElement(tagName: string): boolean {
  return VOID_ELEMENTS.has(tagName.toLowerCase())
}

/**
 * Builds an HTML string from an AST node
 *
 * Recursively processes AST nodes and converts them to HTML.
 * Handles different node types appropriately:
 * - Text nodes are escaped for safe HTML rendering
 * - Element nodes are serialized with attributes and children
 * - Container nodes (Program, Template) concatenate their children
 * - Other nodes (Frontmatter, Expression) are skipped or handled specially
 *
 * @param node - The AST node to convert
 * @returns HTML string representation
 */
function buildNode(node: AstroNode): string {
  switch (node.type) {
    case 'Text':
      return serializeText(node)

    case 'Element':
      // Check if it's a void element and update selfClosing accordingly
      if (isVoidElement(node.name)) {
        return serializeElement({ ...node, selfClosing: true })
      }
      return serializeElement(node)

    case 'Expression':
      // Expressions in the template should be rendered as-is for now
      // In a full implementation, these would be evaluated
      return `{${node.value}}`

    case 'Program':
    case 'Template':
      // Container nodes: concatenate all children
      return node.children.map(child => buildNode(child)).join('')

    case 'Frontmatter':
      // Frontmatter is not rendered in the HTML output
      return ''

    default:
      // Unknown node types are ignored
      return ''
  }
}

/**
 * Builds an HTML string from an Astro AST
 *
 * This is the main entry point for converting a parsed Astro AST
 * into HTML. It processes the entire AST tree and returns the
 * resulting HTML string.
 *
 * @param ast - The Astro AST to convert
 * @returns Complete HTML string
 *
 * @example
 * ```typescript
 * const ast = parse('<p>Hello World</p>')
 * const html = buildHTML(ast)
 * console.log(html) // '<p>Hello World</p>'
 * ```
 */
export function buildHTML(ast: AstroAST): string {
  if (!ast || !ast.children || ast.children.length === 0) {
    return ''
  }

  return ast.children.map(child => buildNode(child)).join('')
}
