/**
 * Markdown processing with Remark for Minimal Astro
 * Content processing and transformation utilities
 */

// Export processor functionality
export {
  createMarkdownProcessor,
  processMarkdown,
  processMarkdownSync,
  defaultMarkdownProcessor,
} from './processor.js';

// Export types
export type {
  MarkdownProcessorOptions,
  ProcessedMarkdown,
  TocEntry,
  Heading,
} from './processor.js';

// Legacy exports for compatibility
// TODO: Re-enable when minimal-astro package is built
// export {
// 	createMarkdownLoader,
// 	parseFrontmatter,
// 	generateSlug,
// 	extractHeadings,
// 	calculateReadingTime,
// } from "minimal-astro";

// Simple markdown processor for educational purposes (kept for backward compatibility)
export function processMarkdownSimple(content: string): {
  html: string;
  frontmatter: Record<string, unknown>;
} {
  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (frontmatterMatch) {
    const [, frontmatterText, markdown] = frontmatterMatch;
    const frontmatter: Record<string, unknown> = {};

    // Simple frontmatter parsing
    for (const line of frontmatterText.split('\n')) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        frontmatter[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }

    // Simple markdown to HTML conversion (educational only)
    const html = markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>');

    return { html, frontmatter };
  }

  // No frontmatter, just process markdown
  const html = content
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/<p><h/g, '<h')
    .replace(/<\/h([1-6])><\/p>/g, '</h$1>');

  return { html, frontmatter: {} };
}
