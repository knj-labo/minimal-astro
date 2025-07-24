/**
 * Content loaders for different file types
 * Handles Markdown, MDX, JSON, and YAML content
 */
import type { ContentEntry, ContentLoader, Heading, ReadingTime } from './types.js';
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
export declare function parseFrontmatter(content: string): {
    frontmatter: Record<string, unknown>;
    content: string;
};
/**
 * Generate slug from filename
 */
export declare function generateSlug(filename: string): string;
/**
 * Extract headings from markdown content
 */
export declare function extractHeadings(content: string): Heading[];
/**
 * Calculate reading time
 */
export declare function calculateReadingTime(content: string): ReadingTime;
/**
 * Create markdown content loader
 */
export declare function createMarkdownLoader(options: LoaderOptions): ContentLoader;
/**
 * Create JSON content loader
 */
export declare function createJsonLoader(_options: LoaderOptions): ContentLoader;
/**
 * Create YAML content loader
 */
export declare function createYamlLoader(_options: LoaderOptions): ContentLoader;
/**
 * Auto-detect and create appropriate loader based on file extension
 */
export declare function createAutoLoader(options: LoaderOptions): ContentLoader;
/**
 * Load a content module (placeholder for actual implementation)
 */
export declare function loadContentModule(path: string, _options?: LoaderOptions): Promise<ContentEntry>;
/**
 * Load an entire collection
 */
export declare function loadCollection(_collectionName: string, _options?: LoaderOptions): Promise<ContentEntry[]>;
/**
 * Load a single entry
 */
export declare function loadEntry(_collection: string, _id: string, _options?: LoaderOptions): Promise<ContentEntry | null>;
/**
 * Resolve content path
 */
export declare function resolveContentPath(collection: string, id?: string, options?: LoaderOptions): string;
//# sourceMappingURL=loader.d.ts.map