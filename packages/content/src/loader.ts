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
 * Parse frontmatter from content
 */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const frontmatterRegex = /^---\s*\n?([\s\S]*?)\n?---\s*\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      content: content.trim(),
    };
  }

  const [, frontmatterStr, bodyContent] = match;

  try {
    // Simple YAML parser for frontmatter
    const frontmatter = frontmatterStr.trim() ? parseYaml(frontmatterStr) : {};
    return {
      frontmatter,
      content: bodyContent.trim(),
    };
  } catch (error) {
    // Create a local logger for this function
    const logger = createContextualLogger({ module: 'frontmatter-parser' });
    logger.warn('Failed to parse frontmatter', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      frontmatter: {},
      content: content.trim(),
    };
  }
}

/**
 * Simple YAML parser for frontmatter
 */
function parseYaml(yamlStr: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yamlStr.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    // Remove quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Parse values
    if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else if (value === 'null') {
      result[key] = null;
    } else if (/^\d+$/.test(value)) {
      result[key] = Number.parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      result[key] = Number.parseFloat(value);
    } else if (value.startsWith('[') && value.endsWith(']')) {
      // Simple array parsing
      const items = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim());
      result[key] = items.map((item) => {
        if (item.startsWith('"') && item.endsWith('"')) {
          return item.slice(1, -1);
        }
        return item;
      });
    } else {
      result[key] = value;
    }
  }

  return result;
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
 * Extract headings from markdown content
 */
export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

      headings.push({ level, text, slug });
    }
  }

  return headings;
}

/**
 * Calculate reading time
 */
export function calculateReadingTime(content: string): ReadingTime {
  const words = content
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const minutes = Math.ceil(words / 200); // Average reading speed

  return { minutes, words };
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
 * Create markdown content loader
 */
export function createMarkdownLoader(options: LoaderOptions): ContentLoader {
  const {
    root: _root,
    baseUrl: _baseUrl = '',
    markdownRenderer = defaultMarkdownRenderer,
    extractHeadings: shouldExtractHeadings = true,
    calculateReadingTime: shouldCalculateReadingTime = true,
  } = options;

  return async (file: string, collection: string): Promise<Partial<ContentEntry>> => {
    try {
      // For now, simulate file reading since we don't have filesystem access
      // In a real implementation, you'd read the file here
      const content = ''; // fs.readFileSync(file, 'utf-8');

      const { frontmatter, content: body } = parseFrontmatter(content);
      const slug = generateSlug(file.split('/').pop() ?? '');
      const id = `${collection}/${slug}`;

      // Create render function
      const render = async (): Promise<ContentRenderResult> => {
        const html = await markdownRenderer.render(body);

        const result: ContentRenderResult = { html };

        if (shouldExtractHeadings) {
          result.headings = extractHeadings(body);
        }

        if (shouldCalculateReadingTime) {
          result.readingTime = calculateReadingTime(body);
        }

        return result;
      };

      return {
        id,
        collection,
        slug,
        file,
        data: frontmatter,
        body,
        render,
      };
    } catch (error) {
      throw new Error(`Failed to load content from ${file}: ${error}`);
    }
  };
}

/**
 * Create JSON content loader
 */
export function createJsonLoader(_options: LoaderOptions): ContentLoader {
  return async (file: string, collection: string): Promise<Partial<ContentEntry>> => {
    try {
      // Simulate JSON file reading
      const content = '{}'; // fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(content);

      const slug = generateSlug(file.split('/').pop() ?? '');
      const id = `${collection}/${slug}`;

      return {
        id,
        collection,
        slug,
        file,
        data,
      };
    } catch (error) {
      throw new Error(`Failed to load JSON from ${file}: ${error}`);
    }
  };
}

/**
 * Create YAML content loader
 */
export function createYamlLoader(_options: LoaderOptions): ContentLoader {
  return async (file: string, collection: string): Promise<Partial<ContentEntry>> => {
    try {
      // Simulate YAML file reading
      const content = ''; // fs.readFileSync(file, 'utf-8');
      const data = parseYaml(content);

      const slug = generateSlug(file.split('/').pop() ?? '');
      const id = `${collection}/${slug}`;

      return {
        id,
        collection,
        slug,
        file,
        data,
      };
    } catch (error) {
      throw new Error(`Failed to load YAML from ${file}: ${error}`);
    }
  };
}

/**
 * Auto-detect and create appropriate loader based on file extension
 */
export function createAutoLoader(options: LoaderOptions): ContentLoader {
  const markdownLoader = createMarkdownLoader(options);
  const jsonLoader = createJsonLoader(options);
  const yamlLoader = createYamlLoader(options);

  return async (file: string, collection: string): Promise<Partial<ContentEntry>> => {
    const ext = file.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'md':
      case 'markdown':
      case 'mdx':
        return markdownLoader(file, collection);

      case 'json':
        return jsonLoader(file, collection);

      case 'yaml':
      case 'yml':
        return yamlLoader(file, collection);

      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  };
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
