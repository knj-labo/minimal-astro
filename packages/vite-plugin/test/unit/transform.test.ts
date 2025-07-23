import { describe, expect, test } from 'bun:test';
import type { FragmentNode } from '../../../src/types/ast';
import { transformAstroToJs } from '../../../src/vite-plugin-astro/transform';

describe('transformAstroToJs', () => {
  test('transforms empty AST', () => {
    const ast: FragmentNode = {
      type: 'Fragment',
      name: 'Fragment',
      start: 0,
      end: 0,
      children: [],
    };

    const result = transformAstroToJs(ast, {
      filename: 'test.astro',
    });

    expect(result.code).toContain('export function render');
    expect(result.code).toContain('return { html }');
  });

  test('includes source map comment in dev mode', () => {
    const ast: FragmentNode = {
      type: 'Fragment',
      name: 'Fragment',
      start: 0,
      end: 0,
      children: [],
    };

    const result = transformAstroToJs(ast, {
      filename: 'test.astro',
      dev: true,
      sourceMap: true,
    });

    expect(result.code).toContain('//# sourceMappingURL=');
  });

  test('generates valid source map', () => {
    const ast: FragmentNode = {
      type: 'Fragment',
      name: 'Fragment',
      start: 0,
      end: 0,
      children: [],
    };

    const result = transformAstroToJs(ast, {
      filename: 'test.astro',
      sourceMap: true,
    });

    expect(result.map).toBeDefined();
    const mapObj = JSON.parse(result.map!);
    expect(mapObj.version).toBe(3);
    expect(mapObj.file).toBe('test.astro');
    expect(mapObj.sources).toContain('test.astro');
  });

  test('handles frontmatter', () => {
    const ast: FragmentNode = {
      type: 'Fragment',
      name: 'Fragment',
      start: 0,
      end: 100,
      children: [
        {
          type: 'Frontmatter',
          start: 0,
          end: 50,
          raw: '---\nconst title = "Test"\n---',
          metadata: '---\nconst title = "Test"\n---',
          code: 'const title = "Test"',
        },
      ],
    };

    const result = transformAstroToJs(ast, {
      filename: 'test.astro',
    });

    expect(result.code).toContain('const title = "Test"');
    expect(result.code).toContain('// Auto-generated from test.astro');
  });

  test('applies pretty print when enabled', () => {
    const ast: FragmentNode = {
      type: 'Fragment',
      name: 'Fragment',
      start: 0,
      end: 0,
      children: [],
    };

    const pretty = transformAstroToJs(ast, {
      filename: 'test.astro',
      prettyPrint: true,
    });

    const minified = transformAstroToJs(ast, {
      filename: 'test.astro',
      prettyPrint: false,
    });

    // Pretty printed code should have more whitespace
    expect(pretty.code.split('\n').length).toBeGreaterThan(minified.code.split('\n').length);
  });
});
