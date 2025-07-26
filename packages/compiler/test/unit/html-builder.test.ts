// @ts-ignore
import type { ElementNode, FragmentNode, TextNode } from '@minimal-astro/types/ast';
import { describe, expect, it } from 'vitest';
import {
  buildHtml,
  createStreamingHtmlBuilder,
  escapeHtmlFast,
  escapeHtmlLegacy,
} from '../../src/html-builder.js';
import { parseAstro } from '../../src/parser.js';

describe('HTML Builder', () => {
  describe('Basic HTML Generation', () => {
    it('should build HTML from simple text', () => {
      const source = 'Hello World';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).toBe('Hello World');
    });

    it('should build HTML from elements', () => {
      const source = '<div>content</div>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).toBe('<div>content</div>');
    });

    it('should handle self-closing tags', () => {
      const source = '<br />';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      // Void elements are rendered without closing slash per HTML spec
      expect(html).toBe('<br>');
    });

    it('should handle void elements correctly', () => {
      const source = "<img src='test.jpg' alt='Test'>";
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).toContain('<img');
      expect(html).not.toContain('</img>');
    });
  });

  describe('HTML Escaping', () => {
    it('should escape HTML entities in text', () => {
      const source = "<p>&lt;script&gt;alert('xss')&lt;/script&gt;</p>";
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      // Already escaped entities get double-escaped (expected behavior)
      expect(html).not.toContain('&amp;lt;');
      expect(html).not.toContain('&amp;gt;');
    });

    it('should escape HTML entities in attributes', () => {
      const source = '<div title="Say &quot;Hello&quot;" class=\'test&apos;\'></div>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).not.toContain('&amp;quot;');
    });

    it('should preserve DOCTYPE declarations', () => {
      const source = '<!DOCTYPE html><html></html>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      // DOCTYPE is handled specially and should be preserved
      expect(html).toContain('DOCTYPE html');
    });
  });

  describe('Escape Functions', () => {
    it('should escape HTML correctly with fast version', () => {
      const input = '<script>alert("xss")</script>';
      const escaped = escapeHtmlFast(input);

      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape HTML correctly with legacy version', () => {
      const input = '<script>alert("xss")</script>';
      const escaped = escapeHtmlLegacy(input);

      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle edge cases in escaping', () => {
      const testCases = [
        ['', ''],
        ['no special chars', 'no special chars'],
        ['&amp;&lt;&gt;&quot;&#39;', '&amp;amp;&amp;lt;&amp;gt;&amp;quot;&amp;#39;'],
        [
          'Mixed & content < with > quotes " and \' apostrophes',
          'Mixed &amp; content &lt; with &gt; quotes &quot; and &#39; apostrophes',
        ],
      ];

      for (const [input, expected] of testCases) {
        expect(escapeHtmlFast(input)).toBe(expected);
        expect(escapeHtmlLegacy(input)).toBe(expected);
      }
    });
  });

  describe('Pretty Printing', () => {
    it('should format HTML with proper indentation', () => {
      const source = '<div><p>content</p></div>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast, { prettyPrint: true });

      expect(html).toContain('\n');
      expect(html).toContain('  '); // Indentation
    });

    it('should handle inline content without extra newlines', () => {
      const source = '<p>Simple text</p>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast, { prettyPrint: true });

      expect(html).toBe('<p>Simple text</p>\n');
    });

    it('should handle nested elements with proper indentation', () => {
      const source = '<div><section><h1>Title</h1><p>Content</p></section></div>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast, { prettyPrint: true, indent: '  ' });

      const lines = html.split('\n').filter((line) => line.trim());
      expect(lines.length).toBeGreaterThan(3);
    });
  });

  describe('Expression and Component Rendering', () => {
    it('should render expressions as comments', () => {
      const source = '<h1>{title}</h1>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).toContain('<!-- Expression: title -->');
    });

    it('should evaluate simple expressions from frontmatter', () => {
      const source = "---\nconst title = 'Hello World';\n---\n<h1>{title}</h1>";
      const result = parseAstro(source);
      const html = buildHtml(result.ast, { evaluateExpressions: true });

      expect(html).toContain('<h1>Hello World</h1>');
      expect(html).not.toContain('<!-- Expression: title -->');
    });

    it('should evaluate complex expressions', () => {
      const source = `---\nconst user = { name: 'John', age: 30 };\n---\n<p>{user.name} is {user.age} years old</p>`;
      const result = parseAstro(source);
      const html = buildHtml(result.ast, { evaluateExpressions: true });

      expect(html).toContain('<p>John is 30 years old</p>');
    });

    it('should handle undefined expressions gracefully', () => {
      const source = "---\nconst title = 'Test';\n---\n<h1>{unknownVariable}</h1>";
      const result = parseAstro(source);
      const html = buildHtml(result.ast, { evaluateExpressions: true });

      expect(html).toContain('<h1></h1>');
    });

    it('should handle expressions in attributes', () => {
      const source = `---\nconst className = 'container';\nconst id = 'main';\n---\n<div class={className} id={id}>Content</div>`;
      const result = parseAstro(source);
      const html = buildHtml(result.ast, { evaluateExpressions: true });

      expect(html).toContain('class="container"');
      expect(html).toContain('id="main"');
    });

    it('should render components as comments', () => {
      const source = '<Counter initialCount={42} />';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).toContain('<!-- Component: Counter -->');
    });

    it('should handle components with attributes in comments', () => {
      const source = '<Counter initialCount={42} client:visible />';
      const result = parseAstro(source);
      const html = buildHtml(result.ast, { prettyPrint: true });

      expect(html).toContain('<!-- Component: Counter');
    });

    it('CMP-3: should evaluate arithmetic expressions like {1 + 1} to 2', () => {
      const source = `---
// No variables needed for pure arithmetic
---
<p>The answer is {1 + 1}</p>`;

      const result = parseAstro(source);
      const html = buildHtml(result.ast, { evaluateExpressions: true });

      expect(html).toContain('<p>The answer is 2</p>');
      expect(html).not.toContain('1 + 1');
    });

    it('should evaluate complex arithmetic expressions', () => {
      const source = `---
const x = 10;
const y = 5;
---
<div>
  <p>Addition: {x + y}</p>
  <p>Multiplication: {x * y}</p>
  <p>Complex: {(x + y) * 2 - 10}</p>
</div>`;

      const result = parseAstro(source);
      const html = buildHtml(result.ast, { evaluateExpressions: true });

      expect(html).toContain('<p>Addition: 15</p>');
      expect(html).toContain('<p>Multiplication: 50</p>');
      expect(html).toContain('<p>Complex: 20</p>');
    });
  });

  describe('Frontmatter Handling', () => {
    it('should not render frontmatter in HTML output', () => {
      const source = "---\nconst title = 'Test';\n---\n<h1>Title</h1>";
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).not.toContain('const title');
      expect(html).toContain('<h1>Title</h1>');
    });
  });

  describe('Attribute Handling', () => {
    it('should handle boolean attributes', () => {
      const source = '<input disabled required />';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).toContain('disabled');
      expect(html).toContain('required');
    });

    it('should handle string attributes with quotes', () => {
      const source = '<div class="container" id="main"></div>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).toContain('class="container"');
      expect(html).toContain('id="main"');
    });

    it('should handle empty and false attributes', () => {
      const ast: FragmentNode = {
        type: 'Fragment',
        children: [
          {
            type: 'Element',
            tag: 'div',
            attrs: [
              {
                name: 'hidden',
                value: false,
                loc: {
                  start: { line: 1, column: 1, offset: 0 },
                  end: { line: 1, column: 1, offset: 0 },
                },
              },
              {
                name: 'visible',
                value: true,
                loc: {
                  start: { line: 1, column: 1, offset: 0 },
                  end: { line: 1, column: 1, offset: 0 },
                },
              },
            ],
            attributes: [],
            children: [],
            selfClosing: false,
            loc: {
              start: { line: 1, column: 1, offset: 0 },
              end: { line: 1, column: 1, offset: 0 },
            },
          },
        ],
        loc: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      };

      const html = buildHtml(ast);
      expect(html).not.toContain('hidden');
      expect(html).toContain('visible');
    });
  });

  describe('Streaming HTML Builder', () => {
    it('should stream HTML output', async () => {
      const source = '<div><h1>Title</h1><p>Content</p></div>';
      const result = parseAstro(source);

      let output = '';
      const streamBuilder = createStreamingHtmlBuilder({ prettyPrint: false });

      await streamBuilder.buildToStream(result.ast, {
        write: async (chunk: string) => {
          output += chunk;
        },
      });

      expect(output).toContain('<div>');
      expect(output).toContain('<h1>Title</h1>');
      expect(output).toContain('<p>Content</p>');
      expect(output).toContain('</div>');
    });

    it('should handle chunked output', async () => {
      const source = '<p>This is a test of chunked streaming output</p>';
      const result = parseAstro(source);

      const chunks: string[] = [];
      const streamBuilder = createStreamingHtmlBuilder({ chunkSize: 10 });

      await streamBuilder.buildToStream(result.ast, {
        write: async (chunk: string) => {
          chunks.push(chunk);
        },
      });

      expect(chunks.length).toBeGreaterThan(1);
      const fullOutput = chunks.join('');
      expect(fullOutput).toContain('<p>');
      expect(fullOutput).toContain('</p>');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty fragments', () => {
      const ast: FragmentNode = {
        type: 'Fragment',
        children: [],
        loc: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      };

      const html = buildHtml(ast);
      expect(html).toBe('');
    });

    it('should handle mixed content types', () => {
      const source = '---\nconst x = 1;\n---\nText before <em>emphasis</em> and {variable} after.';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).toContain('Text before');
      expect(html).toContain('<em>emphasis</em>');
      expect(html).toContain('<!-- Expression: variable -->');
      expect(html).toContain('after.');
    });

    it('should handle deeply nested structures', () => {
      const source =
        '<html><body><main><section><article><h1>Deep</h1></article></section></main></body></html>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast, { prettyPrint: true });

      expect(html).toContain('<html>');
      expect(html).toContain('<h1>Deep</h1>');
      expect(html).toContain('</html>');
    });
  });

  describe('Streaming Error Handling', () => {
    it('STR-A1: should reject buildToStream when write() fails', async () => {
      const source = '<div>Test content</div>';
      const result = parseAstro(source);

      const streamBuilder = createStreamingHtmlBuilder();
      const errorMessage = 'Write operation failed';

      const failingStream = {
        write: async () => {
          throw new Error(errorMessage);
        },
      };

      await expect(streamBuilder.buildToStream(result.ast, failingStream)).rejects.toThrow(
        errorMessage
      );
    });

    it('should stop processing after write error', async () => {
      const source = '<div><p>First</p><p>Second</p><p>Third</p></div>';
      const result = parseAstro(source);

      const streamBuilder = createStreamingHtmlBuilder({ chunkSize: 1 });
      let writeCount = 0;

      const partiallyFailingStream = {
        write: async (_chunk: string): Promise<void> => {
          writeCount++;
          if (writeCount > 2) {
            throw new Error('Stream interrupted');
          }
        },
      };

      await expect(streamBuilder.buildToStream(result.ast, partiallyFailingStream)).rejects.toThrow(
        'Stream interrupted'
      );

      // Should have attempted only a few writes before stopping
      expect(writeCount).toBeLessThan(10);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('ESC-Edge-Unicode: should correctly escape surrogate pair characters', () => {
      const testCases = [
        ['👍', '👍'], // Thumbs up emoji (U+1F44D)
        ['🎉', '🎉'], // Party popper (U+1F389)
        ['你好', '你好'], // Chinese characters
        ['🇯🇵', '🇯🇵'], // Flag emoji (surrogate pairs)
        ['👨‍👩‍👧‍👦', '👨‍👩‍👧‍👦'], // Family emoji with ZWJ sequences
      ];

      for (const [input, expected] of testCases) {
        expect(escapeHtmlFast(input)).toBe(expected);
        expect(escapeHtmlLegacy(input)).toBe(expected);
      }
    });

    it('should preserve emoji in HTML output', () => {
      const source = '<p>Hello 👋 World 🌍!</p>';
      const result = parseAstro(source);
      const html = buildHtml(result.ast);

      expect(html).toContain('Hello 👋 World 🌍!');
    });

    it('should handle mixed Unicode and HTML entities', () => {
      const input = '<p>Emoji: 👍 & HTML: &lt;tag&gt;</p>';
      const escaped = escapeHtmlFast(input);

      expect(escaped).toContain('👍'); // Emoji preserved
      expect(escaped).toContain('&lt;p&gt;'); // Tags escaped
      expect(escaped).toContain('&amp;lt;'); // Already escaped entities double-escaped
    });
  });

  describe('Performance', () => {
    it('PERF-1kNodes: should transform 1000-node AST within 100ms', () => {
      // Create a large AST with 1000+ nodes
      const nodes: Array<ElementNode | TextNode> = [];
      for (let i = 0; i < 500; i++) {
        nodes.push({
          type: 'Element',
          tag: 'div',
          attrs: [
            {
              name: 'class',
              value: `item-${i}`,
              loc: {
                start: { line: 1, column: 1, offset: 0 },
                end: { line: 1, column: 1, offset: 0 },
              },
            },
            {
              name: 'data-index',
              value: `${i}`,
              loc: {
                start: { line: 1, column: 1, offset: 0 },
                end: { line: 1, column: 1, offset: 0 },
              },
            },
          ],
          attributes: [],
          children: [
            {
              type: 'Text',
              value: `Content ${i}`,
              loc: {
                start: { line: 1, column: 1, offset: 0 },
                end: { line: 1, column: 1, offset: 0 },
              },
            },
          ],
          selfClosing: false,
          loc: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
        });
      }

      const largeAst: FragmentNode = {
        type: 'Fragment',
        children: nodes,
        loc: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      };

      // Verify we have 1000+ nodes (334 divs * 3 nodes each = 1002 nodes)
      const nodeCount = nodes.length + nodes.reduce((sum, node) => sum + node.children.length, 0);
      expect(nodeCount).toBeGreaterThanOrEqual(1000);

      // Measure performance
      const startTime = performance.now();
      const html = buildHtml(largeAst);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(html).toContain('Content 0');
      expect(html).toContain('Content 333');
    });
  });
});
