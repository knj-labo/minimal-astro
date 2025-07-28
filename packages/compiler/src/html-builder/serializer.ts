/**
 * AST to HTML serialization utilities
 *
 * This module provides functions to convert AST nodes into HTML strings,
 * handling proper escaping and formatting for safe rendering.
 *
 * @module serializer
 */

import type { AstroNode, ElementNode, ExpressionNode, TextNode } from '../parser/ast.js'
import { escapeHtml } from './escape.js'

/**
 * Serializes a text node to HTML
 *
 * Converts a TextNode to an HTML-safe string by escaping
 * special characters to prevent XSS attacks.
 *
 * @param node - The text node to serialize
 * @returns HTML-escaped text content
 *
 * @example
 * ```typescript
 * serializeText({ type: 'Text', value: 'Hello <world>' })
 * // Returns: 'Hello &lt;world&gt;'
 * ```
 */
export function serializeText(node: TextNode): string {
  return escapeHtml(node.value)
}

/**
 * Serializes attributes to HTML attribute string
 *
 * @param attributes - Array of element attributes
 * @returns Formatted attribute string
 */
function serializeAttributes(
  attributes: Array<{ name: string; value: string | ExpressionNode }>,
): string {
  if (!attributes.length) return ''

  const attrStrings = attributes.map(attr => {
    // For expression values, we render them as-is (without escaping)
    // since they represent dynamic JavaScript expressions
    const value = typeof attr.value === 'string' ? escapeHtml(attr.value) : `{${attr.value.value}}`

    return `${attr.name}="${value}"`
  })

  return ` ${attrStrings.join(' ')}`
}

/**
 * Serializes an element node to HTML
 *
 * Converts an ElementNode to an HTML string, including:
 * - Opening and closing tags
 * - Attributes with proper escaping
 * - Recursively serialized child nodes
 * - Self-closing tag handling
 *
 * @param node - The element node to serialize
 * @returns Complete HTML element string
 *
 * @example
 * ```typescript
 * serializeElement({
 *   type: 'Element',
 *   name: 'div',
 *   attributes: [{ name: 'class', value: 'container' }],
 *   children: [{ type: 'Text', value: 'Hello' }],
 *   selfClosing: false
 * })
 * // Returns: '<div class="container">Hello</div>'
 * ```
 */
export function serializeElement(node: ElementNode): string {
  const { name, attributes, children, selfClosing } = node
  const attrString = serializeAttributes(attributes)

  if (selfClosing) {
    return `<${name}${attrString} />`
  }

  const childrenHtml = children.map(child => serializeNode(child)).join('')

  return `<${name}${attrString}>${childrenHtml}</${name}>`
}

/**
 * Serializes any AST node to HTML
 *
 * This is a dispatcher function that routes different node types
 * to their appropriate serialization functions.
 *
 * @param node - The AST node to serialize
 * @returns HTML string representation of the node
 */
function serializeNode(node: AstroNode): string {
  switch (node.type) {
    case 'Text':
      return serializeText(node)
    case 'Element':
      return serializeElement(node)
    case 'Expression':
      // Expressions in the template are rendered as-is
      return `{${node.value}}`
    case 'Template':
      // Template nodes are containers, serialize their children
      return node.children.map(child => serializeNode(child)).join('')
    default:
      // Skip nodes that shouldn't be serialized to HTML
      // (e.g., Frontmatter, Program)
      return ''
  }
}
