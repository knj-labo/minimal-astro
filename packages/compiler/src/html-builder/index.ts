/**
 * HTML Builder module exports
 *
 * This module provides utilities for converting AST nodes to HTML strings
 * with proper escaping and formatting.
 *
 * @module html-builder
 */

export { escapeHtml } from './escape.js'
export { serializeText, serializeElement } from './serializer.js'
export { buildHTML } from './builder.js'
