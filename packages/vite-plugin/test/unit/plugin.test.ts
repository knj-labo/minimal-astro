import { describe, expect, test } from 'bun:test';
import type { Plugin } from 'vite';
import { astroVitePlugin } from '../../../src/vite-plugin-astro/plugin';

describe('astroVitePlugin', () => {
  test('creates plugin with correct name', () => {
    const plugin = astroVitePlugin();
    expect(plugin.name).toBe('minimal-astro');
  });

  test('enforces pre phase', () => {
    const plugin = astroVitePlugin();
    expect(plugin.enforce).toBe('pre');
  });

  test('accepts options', () => {
    const plugin = astroVitePlugin({
      dev: true,
      prettyPrint: false,
      extensions: ['.astro', '.md'],
    });
    expect(plugin).toBeDefined();
  });

  describe('transform', () => {
    test('ignores non-astro files', () => {
      const plugin = astroVitePlugin();
      const result = plugin.transform?.('const x = 1', 'file.js');
      expect(result).toBeNull();
    });

    test('returns null for already transformed code', () => {
      const plugin = astroVitePlugin();
      const code = '// Auto-generated from file.astro\nexport default function() {}';
      const result = plugin.transform?.(code, 'file.astro');
      expect(result).toBeNull();
    });
  });

  describe('load', () => {
    test('returns null for all files', () => {
      const plugin = astroVitePlugin();
      expect(plugin.load?.('file.astro')).toBeNull();
      expect(plugin.load?.('file.js')).toBeNull();
    });
  });

  describe('handleHotUpdate', () => {
    test('ignores non-astro and non-css files', async () => {
      const plugin = astroVitePlugin({ dev: true });
      const ctx = {
        file: 'file.js',
        modules: [],
        server: {} as import('vite').ViteDevServer,
        read: async () => '',
      };
      const result = await plugin.handleHotUpdate?.(ctx as import('vite').HmrContext);
      expect(result).toBeUndefined();
    });

    test('returns empty array when not in dev mode', async () => {
      const plugin = astroVitePlugin({ dev: false });
      const ctx = {
        file: 'file.astro',
        modules: [],
        server: {} as import('vite').ViteDevServer,
        read: async () => '',
      };
      const result = await plugin.handleHotUpdate?.(ctx as import('vite').HmrContext);
      expect(result).toEqual([]);
    });
  });

  describe('configureServer', () => {
    test('adds middleware to server', () => {
      const plugin = astroVitePlugin();
      const server = {
        middlewares: {
          stack: [] as import('connect').HandleFunction[],
        },
        config: {
          root: '/test',
        },
      };

      plugin.configureServer?.(server as import('vite').ViteDevServer);

      expect(server.middlewares.stack.length).toBe(1);
      expect(server.middlewares.stack[0].route).toBe('');
      expect(server.middlewares.stack[0].handle).toBeDefined();
    });
  });

  describe('buildEnd', () => {
    test('cleans up resources', () => {
      const plugin = astroVitePlugin();
      // Should not throw
      expect(() => plugin.buildEnd?.()).not.toThrow();
    });
  });
});
