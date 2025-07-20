/**
 * Content Collections API
 * Provides type-safe content querying and management
 */

import { createContextualLogger } from '../utils/logger.js';
import { createAutoLoader } from './loader.js';
import { validateContentEntry } from './schema.js';
import type {
  CollectionConfig,
  ContentAPI,
  ContentConfig,
  ContentEntry,
  ContentQuery,
} from './types.js';

export interface ContentManagerOptions {
  /**
   * Content root directory
   */
  root: string;

  /**
   * Content configuration
   */
  config: ContentConfig;

  /**
   * Base URL for content
   */
  baseUrl?: string;

  /**
   * Enable development mode features
   */
  dev?: boolean;
}

/**
 * Content query implementation
 */
class ContentQueryImpl<T = Record<string, unknown>> implements ContentQuery<T> {
  private entries: ContentEntry<T>[];
  private filters: Array<(entry: ContentEntry<T>) => boolean> = [];
  private sorters: Array<(a: ContentEntry<T>, b: ContentEntry<T>) => number> = [];
  private limitCount?: number;
  private skipCount?: number;

  constructor(entries: ContentEntry<T>[]) {
    this.entries = entries;
  }

  where(predicate: (entry: ContentEntry<T>) => boolean): ContentQuery<T> {
    this.filters.push(predicate);
    return this;
  }

  sort(compareFn: (a: ContentEntry<T>, b: ContentEntry<T>) => number): ContentQuery<T> {
    this.sorters.push(compareFn);
    return this;
  }

  limit(count: number): ContentQuery<T> {
    this.limitCount = count;
    return this;
  }

  skip(count: number): ContentQuery<T> {
    this.skipCount = count;
    return this;
  }

  async all(): Promise<ContentEntry<T>[]> {
    let results = [...this.entries];

    // Apply filters
    for (const filter of this.filters) {
      results = results.filter(filter);
    }

    // Apply sorting
    for (const sorter of this.sorters) {
      results.sort(sorter);
    }

    // Apply skip
    if (this.skipCount) {
      results = results.slice(this.skipCount);
    }

    // Apply limit
    if (this.limitCount) {
      results = results.slice(0, this.limitCount);
    }

    return results;
  }

  async first(): Promise<ContentEntry<T> | null> {
    const results = await this.all();
    return results[0] ?? null;
  }

  async count(): Promise<number> {
    let results = [...this.entries];

    // Apply filters only
    for (const filter of this.filters) {
      results = results.filter(filter);
    }

    return results.length;
  }
}

/**
 * Content manager implementation
 */
export function createContentManager(options: ContentManagerOptions): ContentAPI {
  const { root, config, baseUrl = '', dev = false } = options;

  // In-memory content store
  const contentStore = new Map<string, ContentEntry[]>();
  const collections = new Set<string>();
  const logger = createContextualLogger({ module: 'content-manager' });

  /**
   * Load content for a collection
   */
  async function loadCollection(name: string): Promise<ContentEntry[]> {
    if (contentStore.has(name)) {
      return contentStore.get(name) as ContentEntry[];
    }

    const collectionConfig = config.collections[name];
    if (!collectionConfig) {
      throw new Error(`Collection "${name}" not found in config`);
    }

    try {
      const entries = await loadCollectionEntries(name, collectionConfig);
      contentStore.set(name, entries);
      collections.add(name);
      return entries;
    } catch (error) {
      logger.error(
        `Failed to load collection "${name}"`,
        error instanceof Error ? error : new Error(String(error)),
        { collection: name }
      );
      return [];
    }
  }

  /**
   * Load entries for a specific collection
   */
  async function loadCollectionEntries(
    name: string,
    config: CollectionConfig
  ): Promise<ContentEntry[]> {
    // Scan the filesystem for collection files
    const files = await scanCollectionFiles(name, config, root);

    const loader = config.loader ?? createAutoLoader({ root, baseUrl });
    const entries: ContentEntry[] = [];

    for (const file of files) {
      try {
        const partialEntry = await loader(file, name);
        const entry: ContentEntry = {
          id: partialEntry.id ?? `${name}/${file}`,
          collection: name,
          slug: partialEntry.slug ?? file,
          file: partialEntry.file ?? file,
          data: partialEntry.data ?? {},
          body: partialEntry.body,
          render: partialEntry.render,
        };

        // Validate against schema
        if (config.schema) {
          const validation = validateContentEntry(entry, config.schema);
          if (!validation.valid) {
            logger.error(`Validation failed for ${entry.id}`, {
              errors: validation.errors,
              entryId: entry.id,
            });
            if (!dev) {
              continue; // Skip invalid entries in production
            }
          } else {
            entry.data = validation.data as Record<string, unknown>;
          }
        }

        // Apply transform
        if (config.transform) {
          const transformed = await config.transform(entry);
          entries.push(transformed);
        } else {
          entries.push(entry);
        }
      } catch (error) {
        logger.error(
          `Failed to load entry ${file}`,
          error instanceof Error ? error : new Error(String(error)),
          { file }
        );
        if (!dev) {
          // Skip failed entries in production
        }
      }
    }

    return entries;
  }

  /**
   * Invalidate collection cache
   */
  function invalidateCollection(name: string): void {
    contentStore.delete(name);
  }

  /**
   * Invalidate all caches
   */
  function invalidateAll(): void {
    contentStore.clear();
    collections.clear();
  }

  // Public API
  const api: ContentAPI = {
    async getCollection<T = Record<string, unknown>>(name: string): Promise<ContentEntry<T>[]> {
      const entries = await loadCollection(name);
      return entries as ContentEntry<T>[];
    },

    async getEntry<T = Record<string, unknown>>(
      collection: string,
      id: string
    ): Promise<ContentEntry<T> | null> {
      const entries = await loadCollection(collection);
      const fullId = id.includes('/') ? id : `${collection}/${id}`;
      return (entries.find((entry) => entry.id === fullId) as ContentEntry<T>) ?? null;
    },

    async getEntryBySlug<T = Record<string, unknown>>(
      collection: string,
      slug: string
    ): Promise<ContentEntry<T> | null> {
      const entries = await loadCollection(collection);
      return (entries.find((entry) => entry.slug === slug) as ContentEntry<T>) ?? null;
    },

    query<T = Record<string, unknown>>(collection: string): ContentQuery<T> {
      // Note: This is async but returns sync for API compatibility
      // In practice, you'd want to make this async or pre-load collections
      const entries = contentStore.get(collection) ?? [];
      return new ContentQueryImpl(entries as ContentEntry<T>[]);
    },

    getCollections(): string[] {
      return Array.from(collections);
    },
  };

  // Extend API with manager functions for internal use
  return Object.assign(api, {
    invalidateCollection,
    invalidateAll,
    loadCollection,
  });
}

/**
 * Global content API instance
 */
let globalContentAPI: ContentAPI | null = null;

/**
 * Initialize global content API
 */
export function initializeContentAPI(options: ContentManagerOptions): ContentAPI {
  globalContentAPI = createContentManager(options);
  return globalContentAPI;
}

/**
 * Get global content API instance
 */
export function getContentAPI(): ContentAPI {
  if (!globalContentAPI) {
    throw new Error('Content API not initialized. Call initializeContentAPI first.');
  }
  return globalContentAPI;
}

/**
 * Collection helper functions
 */
export const collections = {
  /**
   * Get all entries from a collection
   */
  async get<T = Record<string, unknown>>(name: string): Promise<ContentEntry<T>[]> {
    const api = getContentAPI();
    return api.getCollection<T>(name);
  },

  /**
   * Get entry by ID
   */
  async getById<T = Record<string, unknown>>(
    collection: string,
    id: string
  ): Promise<ContentEntry<T> | null> {
    const api = getContentAPI();
    return api.getEntry<T>(collection, id);
  },

  /**
   * Get entry by slug
   */
  async getBySlug<T = Record<string, unknown>>(
    collection: string,
    slug: string
  ): Promise<ContentEntry<T> | null> {
    const api = getContentAPI();
    return api.getEntryBySlug<T>(collection, slug);
  },

  /**
   * Query collection
   */
  query<T = Record<string, unknown>>(collection: string): ContentQuery<T> {
    const api = getContentAPI();
    return api.query<T>(collection);
  },

  /**
   * Get all collection names
   */
  list(): string[] {
    const api = getContentAPI();
    return api.getCollections();
  },
};

/**
 * Type-safe property access helpers
 */
function getDataProperty<T>(data: T, key: string): unknown {
  return data && typeof data === 'object' && key in data
    ? (data as Record<string, unknown>)[key]
    : undefined;
}

/**
 * Common query helpers
 */
export const queries = {
  /**
   * Sort by date (newest first)
   */
  byDateDesc<T = Record<string, unknown>>(a: ContentEntry<T>, b: ContentEntry<T>): number {
    const dateA = new Date((getDataProperty(a.data, 'date') as string | Date) ?? 0);
    const dateB = new Date((getDataProperty(b.data, 'date') as string | Date) ?? 0);
    return dateB.getTime() - dateA.getTime();
  },

  /**
   * Sort by date (oldest first)
   */
  byDateAsc<T = Record<string, unknown>>(a: ContentEntry<T>, b: ContentEntry<T>): number {
    const dateA = new Date((getDataProperty(a.data, 'date') as string | Date) ?? 0);
    const dateB = new Date((getDataProperty(b.data, 'date') as string | Date) ?? 0);
    return dateA.getTime() - dateB.getTime();
  },

  /**
   * Sort by title
   */
  byTitle<T = Record<string, unknown>>(a: ContentEntry<T>, b: ContentEntry<T>): number {
    const titleA = String(getDataProperty(a.data, 'title') ?? '');
    const titleB = String(getDataProperty(b.data, 'title') ?? '');
    return titleA.localeCompare(titleB);
  },

  /**
   * Filter by draft status
   */
  published<T = Record<string, unknown>>(entry: ContentEntry<T>): boolean {
    return !getDataProperty(entry.data, 'draft');
  },

  /**
   * Filter by tag
   */
  withTag<T = Record<string, unknown>>(tag: string) {
    return (entry: ContentEntry<T>): boolean => {
      const tags = getDataProperty(entry.data, 'tags');
      return Array.isArray(tags) && tags.includes(tag);
    };
  },

  /**
   * Filter by category
   */
  inCategory<T = Record<string, unknown>>(category: string) {
    return (entry: ContentEntry<T>): boolean => {
      return getDataProperty(entry.data, 'category') === category;
    };
  },
};

/**
 * Scan filesystem for collection files
 */
async function scanCollectionFiles(
  collectionName: string,
  config: CollectionConfig,
  rootDir: string
): Promise<string[]> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const collectionDir = path.join(rootDir, collectionName);

  try {
    // Check if collection directory exists
    await fs.access(collectionDir);
  } catch {
    // Collection directory doesn't exist, return empty array
    return [];
  }

  // Determine file patterns based on config or use defaults
  const patterns = config.patterns ?? getDefaultPatterns();
  const foundFiles: string[] = [];

  // Recursively scan directory
  async function scanDirectory(dir: string, basePath = ''): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(fullPath, relativePath);
        } else if (entry.isFile()) {
          // Check if file matches any pattern
          for (const pattern of patterns) {
            if (matchesPattern(entry.name, pattern)) {
              foundFiles.push(relativePath);
              break;
            }
          }
        }
      }
    } catch (error) {
      // Directory not accessible, skip
      console.warn(`Cannot read directory ${dir}:`, error);
    }
  }

  await scanDirectory(collectionDir);
  return foundFiles.sort();
}

/**
 * Get default file patterns for content collections
 */
function getDefaultPatterns(): string[] {
  return ['*.md', '*.mdx', '*.json', '*.yaml', '*.yml'];
}

/**
 * Simple pattern matching (supports * wildcard)
 */
function matchesPattern(filename: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(filename);
}
