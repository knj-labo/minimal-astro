import { beforeEach, describe, expect, it } from 'bun:test';
import {
  clearRenderers,
  createUniversalRenderer,
  getAllRenderers,
  getRenderer,
  registerFramework,
} from '../../../../src/core/renderer/universal-ssr.js';

describe('Universal SSR', () => {
  beforeEach(() => {
    // Clear any existing renderers before each test
    clearRenderers();
  });

  describe('registerFramework', () => {
    it('should register a framework renderer', () => {
      const mockRenderer = {
        name: 'test-framework',
        check: (Component: unknown) =>
          Boolean((Component as { _isTestFramework?: boolean })._isTestFramework),
        renderToString: async (Component: unknown, props: unknown) => {
          return `<div>${Component.name} with ${JSON.stringify(props)}</div>`;
        },
      };

      registerFramework(mockRenderer);

      const renderer = getRenderer('test-framework');
      expect(renderer).toBeDefined();
      expect(renderer?.name).toBe('test-framework');
    });

    it('should allow registering multiple frameworks', () => {
      const renderer1 = {
        name: 'framework1',
        check: () => true,
        renderToString: async () => '<div>1</div>',
      };

      const renderer2 = {
        name: 'framework2',
        check: () => true,
        renderToString: async () => '<div>2</div>',
      };

      registerFramework(renderer1);
      registerFramework(renderer2);

      const all = getAllRenderers();
      expect(all).toHaveLength(2);
      expect(all.map((r) => r.name)).toContain('framework1');
      expect(all.map((r) => r.name)).toContain('framework2');
    });

    it('should overwrite existing renderer with same name', () => {
      const renderer1 = {
        name: 'test',
        check: () => false,
        renderToString: async () => 'old',
      };

      const renderer2 = {
        name: 'test',
        check: () => true,
        renderToString: async () => 'new',
      };

      registerFramework(renderer1);
      registerFramework(renderer2);

      const renderer = getRenderer('test');
      expect(renderer?.check()).toBe(true);
    });
  });

  describe('getRenderer', () => {
    it('should return registered renderer by name', () => {
      const mockRenderer = {
        name: 'mock',
        check: () => true,
        renderToString: async () => '',
      };

      registerFramework(mockRenderer);

      const renderer = getRenderer('mock');
      expect(renderer).toBeDefined();
      expect(renderer?.name).toBe('mock');
    });

    it('should return undefined for unregistered renderer', () => {
      const renderer = getRenderer('non-existent');
      expect(renderer).toBeUndefined();
    });
  });

  describe('getAllRenderers', () => {
    it('should return empty array when no renderers registered', () => {
      const renderers = getAllRenderers();
      expect(renderers).toEqual([]);
    });

    it('should return all registered renderers', () => {
      registerFramework({ name: 'a', check: () => true, renderToString: async () => '' });
      registerFramework({ name: 'b', check: () => true, renderToString: async () => '' });
      registerFramework({ name: 'c', check: () => true, renderToString: async () => '' });

      const renderers = getAllRenderers();
      expect(renderers).toHaveLength(3);
      expect(renderers.map((r) => r.name).sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('clearRenderers', () => {
    it('should remove all registered renderers', () => {
      registerFramework({ name: 'test1', check: () => true, renderToString: async () => '' });
      registerFramework({ name: 'test2', check: () => true, renderToString: async () => '' });

      expect(getAllRenderers()).toHaveLength(2);

      clearRenderers();

      expect(getAllRenderers()).toHaveLength(0);
    });
  });

  describe('createUniversalRenderer', () => {
    it('should create a renderer that detects framework automatically', async () => {
      // Register mock renderers
      registerFramework({
        name: 'react',
        check: (Component: unknown) => Boolean((Component as { _isReact?: boolean })._isReact),
        renderToString: async (Component: unknown, _props: unknown) => {
          return `<react>${Component.name}</react>`;
        },
      });

      registerFramework({
        name: 'vue',
        check: (Component: unknown) => (Component as { _isVue: boolean })._isVue === true,
        renderToString: async (Component: unknown, _props: unknown) => {
          return `<vue>${Component.name}</vue>`;
        },
      });

      const universalRenderer = createUniversalRenderer();

      // Test React component
      const ReactComponent = { name: 'MyReactComponent', _isReact: true };
      const reactResult = await universalRenderer.renderToString(ReactComponent, {});
      expect(reactResult).toBe('<react>MyReactComponent</react>');

      // Test Vue component
      const VueComponent = { name: 'MyVueComponent', _isVue: true };
      const vueResult = await universalRenderer.renderToString(VueComponent, {});
      expect(vueResult).toBe('<vue>MyVueComponent</vue>');
    });

    it('should throw error for unknown component type', async () => {
      const universalRenderer = createUniversalRenderer();
      const UnknownComponent = { name: 'Unknown' };

      await expect(universalRenderer.renderToString(UnknownComponent, {})).rejects.toThrow();
    });

    it('should pass props correctly to renderer', async () => {
      registerFramework({
        name: 'test',
        check: () => true,
        renderToString: async (Component: unknown, props: unknown) => {
          return JSON.stringify({ component: Component.name, props });
        },
      });

      const universalRenderer = createUniversalRenderer();
      const Component = { name: 'TestComponent' };
      const props = { foo: 'bar', count: 42 };

      const result = await universalRenderer.renderToString(Component, props);
      const parsed = JSON.parse(result);

      expect(parsed.component).toBe('TestComponent');
      expect(parsed.props).toEqual(props);
    });

    it('should handle async rendering', async () => {
      registerFramework({
        name: 'async-test',
        check: () => true,
        renderToString: async (Component: unknown) => {
          // Simulate async work
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `<div>Async ${Component.name}</div>`;
        },
      });

      const universalRenderer = createUniversalRenderer();
      const Component = { name: 'AsyncComponent' };

      const result = await universalRenderer.renderToString(Component, {});
      expect(result).toBe('<div>Async AsyncComponent</div>');
    });

    it('should handle rendering errors gracefully', async () => {
      registerFramework({
        name: 'error-test',
        check: () => true,
        renderToString: async () => {
          throw new Error('Render failed');
        },
      });

      const universalRenderer = createUniversalRenderer();
      const Component = { name: 'ErrorComponent' };

      await expect(universalRenderer.renderToString(Component, {})).rejects.toThrow(
        'Render failed'
      );
    });
  });
});
