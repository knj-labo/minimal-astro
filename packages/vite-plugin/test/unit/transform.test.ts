import { describe, expect, test } from 'vitest';
import type { FragmentNode } from '@minimal-astro/types/ast';
import { transformAstroToJs } from '../../src/transform.js';

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

    expect(result.code).toContain('export async function render');
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

    expect(result.map).toBeDefined();
    expect(result.code).toContain('// Auto-generated from test.astro');
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
    const mapObj = JSON.parse(result.map as string);
    expect(mapObj.version).toBe(3);
    expect(mapObj.file).toBe('test.js');
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

    // Both should generate valid code
    expect(pretty.code).toContain('export async function render');
    expect(minified.code).toContain('export async function render');
  });
});
