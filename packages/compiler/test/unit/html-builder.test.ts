import { describe, expect, it } from 'bun:test';
import {
  buildHtml,
  createStreamingHtmlBuilder,
  escapeHtmlFast,
  escapeHtmlLegacy,
} from '../../src/html-builder.js';
import { parseAstro } from '../../src/parser.js';
import type { FragmentNode } from '@minimal-astro/types/ast';

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

      testCases.forEach(([input, expected]) => {
        expect(escapeHtmlFast(input)).toBe(expected);
        expect(escapeHtmlLegacy(input)).toBe(expected);
      });
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
      const source =
        "---\nconst user = { name: 'John', age: 30 };\n---\n<p>{user.name} is {user.age} years old</p>";
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
      const source =
        "---\nconst className = 'container';\nconst id = 'main';\n---\n<div class={className} id={id}>Content</div>";
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
});
