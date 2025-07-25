/**
 * Content loaders for different file types
 * Handles Markdown, MDX, JSON, and YAML content
 */

import type { ContentEntry } from './types.js';

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
