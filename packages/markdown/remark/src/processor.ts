/**
 * Advanced Markdown processor using remark and rehype
 * Supports frontmatter, GFM, and custom transformations
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import matter from "gray-matter";

// ============================================================================
// TYPES
// ============================================================================

export interface MarkdownProcessorOptions {
	/**
	 * Enable GitHub Flavored Markdown
	 */
	gfm?: boolean;

	/**
	 * Enable syntax highlighting
	 */
	syntaxHighlight?: boolean;

	/**
	 * Custom remark plugins
	 */
	remarkPlugins?: any[];

	/**
	 * Custom rehype plugins
	 */
	rehypePlugins?: any[];

	/**
	 * Generate table of contents
	 */
	generateToc?: boolean;

	/**
	 * Extract reading time
	 */
	calculateReadingTime?: boolean;
}

export interface ProcessedMarkdown {
	/**
	 * Rendered HTML content
	 */
	html: string;

	/**
	 * Extracted frontmatter
	 */
	frontmatter: Record<string, any>;

	/**
	 * Generated table of contents
	 */
	toc?: TocEntry[];

	/**
	 * Estimated reading time in minutes
	 */
	readingTime?: number;

	/**
	 * Extracted headings
	 */
	headings?: Heading[];

	/**
	 * Word count
	 */
	wordCount?: number;
}

export interface TocEntry {
	/**
	 * Heading text
	 */
	text: string;

	/**
	 * Heading level (1-6)
	 */
	level: number;

	/**
	 * URL slug
	 */
	slug: string;

	/**
	 * Child entries
	 */
	children?: TocEntry[];
}

export interface Heading {
	/**
	 * Heading text
	 */
	text: string;

	/**
	 * Heading level (1-6)
	 */
	level: number;

	/**
	 * Generated slug
	 */
	slug: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generates a URL-friendly slug from text
 */
function generateSlug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

/**
 * Calculates reading time based on word count
 */
function calculateReadingTime(text: string, wordsPerMinute = 200): number {
	const words = text.trim().split(/\s+/).length;
	return Math.ceil(words / wordsPerMinute);
}

/**
 * Extracts headings from markdown content
 */
function extractHeadings(html: string): Heading[] {
	const headings: Heading[] = [];
	const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
	let match;

	while ((match = headingRegex.exec(html)) !== null) {
		const level = parseInt(match[1], 10);
		const text = match[2].replace(/<[^>]*>/g, "").trim();
		const slug = generateSlug(text);

		headings.push({
			text,
			level,
			slug,
		});
	}

	return headings;
}

/**
 * Generates table of contents from headings
 */
function generateToc(headings: Heading[]): TocEntry[] {
	const toc: TocEntry[] = [];
	const stack: TocEntry[] = [];

	for (const heading of headings) {
		const entry: TocEntry = {
			text: heading.text,
			level: heading.level,
			slug: heading.slug,
			children: [],
		};

		// Find the appropriate parent level
		while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
			stack.pop();
		}

		if (stack.length === 0) {
			toc.push(entry);
		} else {
			const parent = stack[stack.length - 1];
			if (!parent.children) {
				parent.children = [];
			}
			parent.children.push(entry);
		}

		stack.push(entry);
	}

	return toc;
}

// ============================================================================
// CUSTOM PLUGINS
// ============================================================================

/**
 * Plugin to add IDs to headings
 */
function rehypeHeadingIds() {
	return (tree: any) => {
		const visit = (node: any) => {
			if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) {
				const text = getTextContent(node);
				const slug = generateSlug(text);
				
				if (!node.properties) {
					node.properties = {};
				}
				node.properties.id = slug;
			}

			if (node.children) {
				node.children.forEach(visit);
			}
		};

		visit(tree);
	};
}

/**
 * Get text content from a node
 */
function getTextContent(node: any): string {
	if (node.type === "text") {
		return node.value;
	}
	
	if (node.children) {
		return node.children.map(getTextContent).join("");
	}
	
	return "";
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

/**
 * Creates a markdown processor with the specified options
 */
export function createMarkdownProcessor(options: MarkdownProcessorOptions = {}) {
	const {
		gfm = true,
		remarkPlugins = [],
		rehypePlugins = [],
		generateToc: shouldGenerateToc = false,
		calculateReadingTime: shouldCalculateReadingTime = false,
	} = options;

	// Build the unified processor
	let processor = unified()
		.use(remarkParse)
		.use(remarkFrontmatter, ["yaml", "toml"]);

	// Add GFM support
	if (gfm) {
		processor = processor.use(remarkGfm);
	}

	// Add custom remark plugins
	for (const plugin of remarkPlugins) {
		processor = processor.use(plugin);
	}

	// Convert to rehype
	processor = processor.use(remarkRehype);

	// Add heading IDs
	processor = processor.use(rehypeHeadingIds);

	// Add custom rehype plugins
	for (const plugin of rehypePlugins) {
		processor = processor.use(plugin);
	}

	// Stringify to HTML
	processor = processor.use(rehypeStringify);

	return {
		/**
		 * Process markdown content
		 */
		async process(content: string): Promise<ProcessedMarkdown> {
			try {
				// Parse frontmatter
				const { data: frontmatter, content: markdownContent } = matter(content);

				// Process with unified
				const result = await processor.process(markdownContent);
				const html = String(result);

				// Extract additional data
				const processed: ProcessedMarkdown = {
					html,
					frontmatter,
				};

				// Calculate reading time
				if (shouldCalculateReadingTime) {
					processed.readingTime = calculateReadingTime(markdownContent);
					processed.wordCount = markdownContent.trim().split(/\s+/).length;
				}

				// Extract headings and generate TOC
				if (shouldGenerateToc) {
					const headings = extractHeadings(html);
					processed.headings = headings;
					processed.toc = generateToc(headings);
				}

				return processed;
			} catch (error) {
				throw new Error(
					`Failed to process markdown: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		},

		/**
		 * Process markdown content synchronously (less safe)
		 */
		processSync(content: string): ProcessedMarkdown {
			try {
				// Parse frontmatter
				const { data: frontmatter, content: markdownContent } = matter(content);

				// Process with unified (sync)
				const result = processor.processSync(markdownContent);
				const html = String(result);

				// Extract additional data
				const processed: ProcessedMarkdown = {
					html,
					frontmatter,
				};

				// Calculate reading time
				if (shouldCalculateReadingTime) {
					processed.readingTime = calculateReadingTime(markdownContent);
					processed.wordCount = markdownContent.trim().split(/\s+/).length;
				}

				// Extract headings and generate TOC
				if (shouldGenerateToc) {
					const headings = extractHeadings(html);
					processed.headings = headings;
					processed.toc = generateToc(headings);
				}

				return processed;
			} catch (error) {
				throw new Error(
					`Failed to process markdown: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		},
	};
}

/**
 * Default markdown processor with sensible defaults
 */
export const defaultMarkdownProcessor = createMarkdownProcessor({
	gfm: true,
	generateToc: true,
	calculateReadingTime: true,
});

/**
 * Process markdown with default settings
 */
export async function processMarkdown(content: string): Promise<ProcessedMarkdown> {
	return defaultMarkdownProcessor.process(content);
}

/**
 * Process markdown synchronously with default settings
 */
export function processMarkdownSync(content: string): ProcessedMarkdown {
	return defaultMarkdownProcessor.processSync(content);
}