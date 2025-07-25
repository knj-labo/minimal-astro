/**
 * Content loaders for different file types
 * Handles Markdown, MDX, JSON, and YAML content
 */

import { createContextualLogger } from '@minimal-astro/internal-helpers';
import type {
  ContentEntry,
  ContentLoader,
  ContentRenderResult,
  Heading,
  ReadingTime,
} from './types.js';

export interface LoaderOptions {
  /**
   * Content root directory
   */
  root: string;

  /**
   * Base URL for content
   */
  baseUrl?: string;

  /**
   * Custom markdown renderer
   */
  markdownRenderer?: MarkdownRenderer;

  /**
   * Extract headings from content
   */
  extractHeadings?: boolean;

  /**
   * Calculate reading time
   */
  calculateReadingTime?: boolean;
}

export interface MarkdownRenderer {
  render(content: string): Promise<string>;
}

/**
 * Generate slug from filename
 */
export function generateSlug(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-z0-9]+/gi, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();
}

/**
 * Default markdown renderer using simple HTML conversion
 */
const defaultMarkdownRenderer: MarkdownRenderer = {
  async render(content: string): Promise<string> {
    // Very basic markdown to HTML conversion
    let html = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\_\_(.*\_\_)/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\_(.*\_)/gim, '<em>$1</em>')
      // Code
      .replace(/`(.*)`/gim, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n/gim, '<br>');

    // Wrap in paragraphs
    html = html
      .split('<br><br>')
      .map((para) => para.trim())
      .filter((para) => para)
      .map((para) => `<p>${para}</p>`)
      .join('\n');

    return html;
  },
};

/**
 * Load a content module (placeholder for actual implementation)
 */
export async function loadContentModule(
  path: string,
  _options?: LoaderOptions
): Promise<ContentEntry> {
  // This is a placeholder implementation
  // In a real implementation, this would load and parse the content file
  return {
    id: path,
    collection: 'default',
    slug: generateSlug(path),
    file: path,
    data: {},
    body: '',
  };
}

/**
 * Load an entire collection
 */
export async function loadCollection(
  _collectionName: string,
  _options?: LoaderOptions
): Promise<ContentEntry[]> {
  // This is a placeholder implementation
  // In a real implementation, this would load all entries in a collection
  return [];
}

/**
 * Load a single entry
 */
export async function loadEntry(
  _collection: string,
  _id: string,
  _options?: LoaderOptions
): Promise<ContentEntry | null> {
  // This is a placeholder implementation
  // In a real implementation, this would load a specific entry
  return null;
}

/**
 * Resolve content path
 */
export function resolveContentPath(
  collection: string,
  id?: string,
  options?: LoaderOptions
): string {
  const root = options?.root ?? './src/content';
  if (id) {
    return `${root}/${collection}/${id}`;
  }
  return `${root}/${collection}`;
}
