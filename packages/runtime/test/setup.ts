import { JSDOM } from 'jsdom';
import { beforeAll, vi } from 'vitest';

// Mock React types
interface MockReact {
  createElement: ReturnType<typeof vi.fn>;
  Component: typeof React.Component;
  useState: ReturnType<typeof vi.fn>;
  useEffect: ReturnType<typeof vi.fn>;
  useCallback: ReturnType<typeof vi.fn>;
  useMemo: ReturnType<typeof vi.fn>;
}

interface MockReactDOM {
  render: ReturnType<typeof vi.fn>;
  hydrate: ReturnType<typeof vi.fn>;
  createRoot: ReturnType<typeof vi.fn>;
}

// Setup DOM environment
beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable',
  });

  // biome-ignore lint/suspicious/noExplicitAny: necessary for test setup to bypass readonly checks
  (global as any).document = dom.window.document;
  // biome-ignore lint/suspicious/noExplicitAny: necessary for test setup to bypass readonly checks
  (global as any).window = dom.window as unknown as Window & typeof globalThis;
  // biome-ignore lint/suspicious/noExplicitAny: necessary for test setup to bypass readonly checks
  (global as any).navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  global.Element = dom.window.Element;
  global.Node = dom.window.Node;
  global.Event = dom.window.Event;
  global.CustomEvent = dom.window.CustomEvent;

  // Mock IntersectionObserver only if not already mocked
  if (!vi.isMockFunction(global.IntersectionObserver)) {
    global.IntersectionObserver = class IntersectionObserver {
      root: Element | null = null;
      rootMargin = '';
      thresholds: ReadonlyArray<number> = [];

      constructor(
        public callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit
      ) {
        this.root = options?.root ?? null;
        this.rootMargin = options?.rootMargin ?? '';
        this.thresholds = options?.threshold ? [options.threshold].flat() : [0];
      }

      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
    } as unknown as typeof IntersectionObserver;
  }

  // Mock requestIdleCallback only if not already mocked
  if (!vi.isMockFunction(global.requestIdleCallback)) {
    global.requestIdleCallback = (callback: IdleRequestCallback) => {
      const start = Date.now();
      return setTimeout(() => {
        callback({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        } as IdleDeadline);
      }, 1) as unknown as number;
    };

    global.cancelIdleCallback = (id: number) => {
      clearTimeout(id);
    };
  }

  // Mock matchMedia only if not already mocked
  if (!vi.isMockFunction(global.matchMedia)) {
    global.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList;
  }

  // Mock React globals to avoid runtime validation errors
  global.React = {
    createElement: vi.fn(),
    Component: class Component {},
    useState: vi.fn(),
    useEffect: vi.fn(),
    useCallback: vi.fn(),
    useMemo: vi.fn(),
  } as unknown as MockReact;

  global.ReactDOM = {
    render: vi.fn(),
    hydrate: vi.fn(),
    createRoot: vi.fn(() => ({
      render: vi.fn(),
      unmount: vi.fn(),
    })),
  } as unknown as MockReactDOM;
});
