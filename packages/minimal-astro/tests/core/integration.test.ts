import { describe, expect, it } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildHtml } from '../../src/core/html-builder.js';
import { parseAstro } from '../../src/core/parse.js';
import { tokenize } from '../../src/core/tokenizer.js';

const FIXTURES_DIR = resolve(import.meta.dir, '../fixtures');

describe('Integration: Tokenizer → Parser → HTML Builder', () => {
  describe('End-to-End Pipeline', () => {
    it('should process simple.astro through the full pipeline', async () => {
      const source = await readFile(resolve(FIXTURES_DIR, 'simple.astro'), 'utf-8');

      // Step 1: Tokenize
      const tokens = tokenize(source);
      expect(tokens.length).toBeGreaterThan(0);

      // Step 2: Parse
      const parseResult = parseAstro(source, { filename: 'simple.astro' });
      expect(parseResult.diagnostics).toHaveLength(0);
      expect(parseResult.ast.type).toBe('Fragment');

      // Step 3: Build HTML
      const html = buildHtml(parseResult.ast, { prettyPrint: true });
      expect(html).toContain('DOCTYPE html');
      expect(html).toContain('<title>');
      expect(html).toContain('<!-- Expression: title -->');
    });

    it('should process with-components.astro through the full pipeline', async () => {
      const source = await readFile(resolve(FIXTURES_DIR, 'with-components.astro'), 'utf-8');

      const parseResult = parseAstro(source, { filename: 'with-components.astro' });
      expect(parseResult.diagnostics).toHaveLength(0);

      const html = buildHtml(parseResult.ast, { prettyPrint: true });
      expect(html).toContain('<!-- Component: Counter -->');
      expect(html).toContain('<!-- Expression: name -->');
    });
  });

  describe('Pipeline Consistency', () => {
    it('should produce consistent results across multiple runs', async () => {
      const source = await readFile(resolve(FIXTURES_DIR, 'simple.astro'), 'utf-8');

      // Run the pipeline multiple times
      const results = [];
      for (let i = 0; i < 3; i++) {
        const parseResult = parseAstro(source, { filename: 'simple.astro' });
        const html = buildHtml(parseResult.ast);
        results.push({ parseResult, html });
      }

      // All results should be identical
      const firstHtml = results[0].html;
      results.forEach((result, _index) => {
        expect(result.html).toBe(firstHtml);
        expect(result.parseResult.diagnostics).toHaveLength(0);
      });
    });

    it('should handle malformed input gracefully', () => {
      const malformedSources = [
        '<div><p>Unclosed tags',
        '{unclosed expression',
        "<div attr='unclosed quote><p>content</p>",
      ];

      malformedSources.forEach((source, index) => {
        const parseResult = parseAstro(source, { filename: `malformed-${index}.astro` });

        // Should not crash
        expect(parseResult.ast).toBeDefined();
        expect(parseResult.ast.type).toBe('Fragment');

        // Should be able to generate HTML even with errors
        const html = buildHtml(parseResult.ast);
        expect(typeof html).toBe('string');
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle reasonably large documents efficiently', () => {
      // Create a moderately sized document
      const largeParts = [];
      largeParts.push('---\nconst items = [1,2,3];\n---\n');
      largeParts.push('<!DOCTYPE html><html><body>');

      for (let i = 0; i < 20; i++) {
        largeParts.push(`<div class="item-${i}"><h2>Item ${i}</h2><p>Content for item</p></div>`);
      }
      largeParts.push('</body></html>');

      const largeSource = largeParts.join('\n');

      const startTime = performance.now();
      const parseResult = parseAstro(largeSource, { filename: 'large.astro' });
      const html = buildHtml(parseResult.ast);
      const endTime = performance.now();

      // Should complete in reasonable time (less than 100ms for this size)
      expect(endTime - startTime).toBeLessThan(100);
      expect(parseResult.diagnostics).toHaveLength(0);
      expect(html.length).toBeGreaterThan(500);
    });
  });
});
