import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentType, HydrationOptions } from '../../src/types';

// Dynamic imports to ensure mocks are set up first
let createHydrationRuntime: typeof import('../../src/hydrate')['createHydrationRuntime'];
let autoHydrate: typeof import('../../src/hydrate')['autoHydrate'];
let hydrate: typeof import('../../src/hydrate')['hydrate'];

beforeAll(async () => {
  // Import after mocks are set up
  const hydrateModule = await import('../../src/hydrate');
  createHydrationRuntime = hydrateModule.createHydrationRuntime;
  autoHydrate = hydrateModule.autoHydrate;
  hydrate = hydrateModule.hydrate;
});

// Define window interface with hydration data
interface WindowWithHydrationData extends Window {
  __ASTRO_HYDRATION_DATA__?: {
    directives: Array<{
      componentId: string;
      type: string;
      value?: string | null;
      props: Record<string, unknown>;
    }>;
  };
  __ASTRO_RUNTIME__?: unknown;
}

// Mock DOM environment
const mockElement = (id: string, attributes: Record<string, string> = {}) => {
  const element = {
    id,
    getAttribute: (name: string) => attributes[name] || null,
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    dispatchEvent: vi.fn(),
    innerHTML: '<div>Mock content</div>',
    children: [],
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  } as unknown as HTMLElement;
  return element;
};

const MockComponent: ComponentType = vi.fn((_props) => {
  return '<div>Rendered</div>';
});

// Set the name for debugging
Object.defineProperty(MockComponent, 'name', {
  value: 'MockComponent',
  configurable: true,
});

describe('Hydration Runtime', () => {
  beforeEach(() => {
    // Setup DOM mocks
    vi.spyOn(document, 'getElementById').mockReturnValue(null);
    vi.spyOn(document, 'querySelectorAll').mockReturnValue([] as unknown as NodeListOf<Element>);
    Object.defineProperty(document, 'readyState', {
      value: 'interactive',
      configurable: true,
      writable: true,
    });
    vi.spyOn(document, 'addEventListener');

    // Set hydration data on the existing window object
    (global.window as WindowWithHydrationData).__ASTRO_HYDRATION_DATA__ = {
      directives: [
        { componentId: 'component-1', type: 'load', value: null, props: {} },
        { componentId: 'component-2', type: 'visible', value: null, props: {} },
        { componentId: 'component-3', type: 'idle', value: null, props: {} },
        { componentId: 'component-4', type: 'media', value: '(min-width: 768px)', props: {} },
        { componentId: 'component-5', type: 'only', value: 'react', props: {} },
      ],
    };

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createHydrationRuntime', () => {
    it('should create a hydration runtime instance', () => {
      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
      };

      const runtime = createHydrationRuntime(options);

      expect(runtime).toBeDefined();
      expect(runtime.hydrateAll).toBeInstanceOf(Function);
      expect(runtime.hydrateComponent).toBeInstanceOf(Function);
      expect(runtime.cleanup).toBeInstanceOf(Function);
      expect(runtime.context).toBeDefined();
    });

    it('should validate runtime availability', () => {
      const options: HydrationOptions = {
        components: new Map(),
        runtime: 'invalid' as unknown as HydrationOptions['runtime'],
      };

      // Should not throw, but log warning
      expect(() => createHydrationRuntime(options)).not.toThrow();
    });

    it('should register framework hooks', () => {
      const onBeforeHydrate = vi.fn();
      const onAfterHydrate = vi.fn();
      const onHydrationError = vi.fn();

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
      };

      const hooks = {
        onBeforeHydrate,
        onAfterHydrate,
        onHydrationError,
      };

      const runtime = createHydrationRuntime(options, hooks);
      expect(runtime).toBeDefined();
    });
  });

  describe('hydrateComponent', () => {
    it('should hydrate a component with client:load', async () => {
      const element = mockElement('component-1', {
        'data-astro-component': 'MockComponent',
      });

      vi.mocked(document.getElementById).mockReturnValue(element);

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        render: vi.fn(),
      };

      // Ensure hydration data exists for this specific component
      (global.window as WindowWithHydrationData).__ASTRO_HYDRATION_DATA__ = {
        directives: [{ componentId: 'component-1', type: 'load', value: null, props: {} }],
      };

      const runtime = createHydrationRuntime(options);

      // Hydrate with immediate=true to test synchronously
      runtime.hydrateComponent(element, true);

      // Should have rendered immediately
      expect(options.render).toHaveBeenCalledWith(MockComponent, element);
    });

    it('should skip already hydrated components', () => {
      const element = mockElement('component-1', {
        'data-astro-component': 'MockComponent',
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        render: vi.fn(),
      };

      const runtime = createHydrationRuntime(options);

      // First hydrate the component
      runtime.hydrateComponent(element, true); // immediate hydration

      // Try to hydrate again
      runtime.hydrateComponent(element);

      // Should only render once
      expect(options.render).toHaveBeenCalledTimes(1);
    });

    it('should handle missing component gracefully', () => {
      const element = mockElement('component-1', {
        'data-astro-component': 'NonExistentComponent',
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
      };

      const runtime = createHydrationRuntime(options);

      // Should not throw
      expect(() => runtime.hydrateComponent(element)).not.toThrow();
    });

    it('should handle immediate hydration', () => {
      const element = mockElement('component-1', {
        'data-astro-component': 'MockComponent',
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        render: vi.fn(),
      };

      const runtime = createHydrationRuntime(options);
      runtime.hydrateComponent(element, true);

      // Should call render immediately
      expect(options.render).toHaveBeenCalledWith(MockComponent, element);
    });
  });

  describe('hydrateAll', () => {
    it('should find and hydrate all components', () => {
      const elements = [
        mockElement('component-1', {
          'data-astro-root': 'true',
          'data-astro-component': 'MockComponent',
        }),
        mockElement('component-2', {
          'data-astro-root': 'true',
          'data-astro-component': 'MockComponent',
        }),
      ];

      // Mock the root element with querySelectorAll
      const mockRootElement = {
        querySelectorAll: vi.fn(() => elements as unknown as NodeListOf<HTMLElement>),
      } as unknown as HTMLElement;

      // Mock document.body to return our mock root element
      Object.defineProperty(document, 'body', {
        value: mockRootElement,
        configurable: true,
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
      };

      const runtime = createHydrationRuntime(options);
      runtime.hydrateAll();

      expect(mockRootElement.querySelectorAll).toHaveBeenCalledWith('[data-astro-root]');
    });

    it('should handle custom root element', () => {
      const rootElement = {
        querySelectorAll: vi.fn(() => [] as unknown as NodeListOf<HTMLElement>),
      } as unknown as HTMLElement;
      const elements = [
        mockElement('component-1', {
          'data-astro-root': 'true',
          'data-astro-component': 'MockComponent',
        }),
      ];

      rootElement.querySelectorAll = vi.fn(() => elements as unknown as NodeListOf<HTMLElement>);

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        root: rootElement,
      };

      const runtime = createHydrationRuntime(options);
      runtime.hydrateAll();

      expect(rootElement.querySelectorAll).toHaveBeenCalledWith('[data-astro-root]');
    });

    it('should handle missing root element', () => {
      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        root: '#non-existent',
      };

      document.querySelector = vi.fn(() => null) as unknown as typeof document.querySelector;

      const runtime = createHydrationRuntime(options);

      // Should not throw
      expect(() => runtime.hydrateAll()).not.toThrow();
    });
  });

  describe('Hydration Strategies', () => {
    it('should schedule client:load hydration immediately', async () => {
      const element = mockElement('component-1', {
        'data-astro-component': 'MockComponent',
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        render: vi.fn(),
      };

      // Ensure hydration data exists
      (global.window as WindowWithHydrationData).__ASTRO_HYDRATION_DATA__ = {
        directives: [{ componentId: 'component-1', type: 'load', value: null, props: {} }],
      };

      const runtime = createHydrationRuntime(options);
      runtime.hydrateComponent(element);

      // Render should not be called immediately
      expect(options.render).not.toHaveBeenCalled();

      // Wait for async scheduling (requestIdleCallback or setTimeout)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should have called render after scheduling
      expect(options.render).toHaveBeenCalledWith(MockComponent, element);
    });

    it('should schedule client:idle hydration with requestIdleCallback', async () => {
      const element = mockElement('component-3', {
        'data-astro-component': 'MockComponent',
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        render: vi.fn(),
      };

      // Ensure hydration data exists for idle component
      (global.window as WindowWithHydrationData).__ASTRO_HYDRATION_DATA__ = {
        directives: [{ componentId: 'component-3', type: 'idle', value: null, props: {} }],
      };

      const runtime = createHydrationRuntime(options);
      runtime.hydrateComponent(element);

      // Render should not be called immediately
      expect(options.render).not.toHaveBeenCalled();

      // Wait for the render to be called using vi.waitFor
      await vi.waitFor(
        () => {
          expect(options.render).toHaveBeenCalledWith(MockComponent, element);
        },
        { timeout: 3000 }
      );
    });

    it('should schedule client:visible hydration with IntersectionObserver', () => {
      const element = mockElement('component-2', {
        'data-astro-component': 'MockComponent',
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
      };

      const runtime = createHydrationRuntime(options);
      runtime.hydrateComponent(element);

      expect(global.IntersectionObserver).toHaveBeenCalled();
      const observer = vi.mocked(global.IntersectionObserver).mock.results[0]?.value;
      expect(observer.observe).toHaveBeenCalledWith(element);
    });

    it('should handle client:media hydration', () => {
      const element = mockElement('component-4', {
        'data-astro-component': 'MockComponent',
      });

      // Hydration data already set in beforeEach

      global.matchMedia = vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })) as unknown as typeof matchMedia;
      Object.defineProperty(window, 'matchMedia', {
        value: global.matchMedia,
        writable: true,
        configurable: true,
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        render: vi.fn(),
      };

      const runtime = createHydrationRuntime(options);
      runtime.hydrateComponent(element);

      expect(global.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    });

    it('should handle client:only hydration', () => {
      const element = mockElement('component-5', {
        'data-astro-component': 'MockComponent',
      });

      // Hydration data already set in beforeEach

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        render: vi.fn(),
      };

      const runtime = createHydrationRuntime(options);
      runtime.hydrateComponent(element);

      // Should hydrate immediately for matching runtime
      expect(options.render).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up observers and pending hydrations', () => {
      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
      };

      const runtime = createHydrationRuntime(options);

      // Just verify cleanup doesn't throw
      expect(() => runtime.cleanup()).not.toThrow();

      // After cleanup, context should be reset
      expect(runtime.context.pending.size).toBe(0);
      expect(runtime.context.observers.intersection).toBeUndefined();
    });
  });

  describe('autoHydrate', () => {
    it('should automatically hydrate all components on DOM ready', () => {
      // Mock document ready state
      Object.defineProperty(document, 'readyState', {
        value: 'loading',
        configurable: true,
      });

      document.addEventListener = vi.fn() as unknown as typeof document.addEventListener;

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
      };

      autoHydrate(options);

      expect(document.addEventListener).toHaveBeenCalledWith(
        'DOMContentLoaded',
        expect.any(Function)
      );
    });

    it('should hydrate immediately if DOM is already loaded', () => {
      Object.defineProperty(document, 'readyState', {
        value: 'complete',
        configurable: true,
      });

      const elements = [
        mockElement('component-1', {
          'data-astro-root': 'true',
          'data-astro-component': 'MockComponent',
        }),
      ];

      // Mock body with querySelectorAll
      const mockBody = {
        querySelectorAll: vi.fn(() => elements as unknown as NodeListOf<HTMLElement>),
      } as unknown as HTMLElement;
      Object.defineProperty(document, 'body', {
        value: mockBody,
        configurable: true,
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
      };

      // Set hydration data
      (global.window as WindowWithHydrationData).__ASTRO_HYDRATION_DATA__ = {
        directives: [{ componentId: 'component-1', type: 'load', value: null, props: {} }],
      };

      autoHydrate(options);

      expect(mockBody.querySelectorAll).toHaveBeenCalledWith('[data-astro-root]');
    });
  });

  describe('manual hydrate function', () => {
    it('should hydrate a specific component', () => {
      const element = mockElement('test-component');
      vi.mocked(document.getElementById).mockReturnValue(element);

      const component: ComponentType = vi.fn((_props) => {
        return '<div>Test Component</div>';
      });
      Object.defineProperty(component, 'name', {
        value: 'TestComponent',
        configurable: true,
      });

      hydrate('test-component', component, { prop: 'value' });

      expect(document.getElementById).toHaveBeenCalledWith('test-component');
    });

    it('should handle missing element', () => {
      vi.mocked(document.getElementById).mockReturnValue(null);

      const component: ComponentType = vi.fn((_props) => {
        return '<div>Test Component</div>';
      });
      Object.defineProperty(component, 'name', {
        value: 'TestComponent',
        configurable: true,
      });

      // Should not throw
      expect(() => hydrate('non-existent', component, {})).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle hydration errors gracefully', () => {
      const element = mockElement('component-1', {
        'data-astro-component': 'MockComponent',
      });

      const failingRender = vi.fn(() => {
        throw new Error('Render failed');
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
        render: failingRender,
      };

      const onHydrationError = vi.fn();
      const hooks = { onHydrationError };

      const runtime = createHydrationRuntime(options, hooks);

      // Should not throw
      expect(() => runtime.hydrateComponent(element, true)).not.toThrow();
    });

    it('should handle missing hydration data', () => {
      (window as unknown as WindowWithHydrationData).__ASTRO_HYDRATION_DATA__ = undefined;

      const element = mockElement('component-1', {
        'data-astro-component': 'MockComponent',
      });

      const options: HydrationOptions = {
        components: new Map([['MockComponent', MockComponent]]),
        runtime: 'vanilla', // Use vanilla for testing to avoid React validation
      };

      const runtime = createHydrationRuntime(options);

      // Should not throw
      expect(() => runtime.hydrateComponent(element)).not.toThrow();
    });
  });
});
