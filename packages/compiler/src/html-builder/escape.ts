/**
 * HTML escape utilities for safe text rendering
 *
 * This module provides functions to escape special HTML characters
 * to prevent XSS attacks and ensure proper rendering of text content.
 *
 * @module escape
 */

const ESCAPE_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#x27;',
}

const ESCAPE_REGEX = /[<>&"']/g

/**
 * Escapes special HTML characters in text
 *
 * Converts characters that have special meaning in HTML (<, >, &, ", ')
 * to their corresponding HTML entities to prevent XSS and ensure
 * proper rendering.
 *
 * @param text - The text to escape
 * @returns The escaped text safe for HTML rendering
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("XSS")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 *
 * escapeHtml('Tom & Jerry')
 * // Returns: 'Tom &amp; Jerry'
 * ```
 */
export function escapeHtml(text: string): string {
  if (!text) return text

  return text.replace(ESCAPE_REGEX, char => ESCAPE_MAP[char])
}
