import { JSDOM } from 'jsdom';
import { vi } from 'vitest';

// Setup DOM environment before any module imports
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

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
})) as unknown as typeof IntersectionObserver;

// requestIdleCallback is now mocked in test/setup/hydration-runtime.ts

// Mock matchMedia with vi.fn to allow tracking
global.matchMedia = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof matchMedia;

// requestIdleCallback window properties are now set in test/setup/hydration-runtime.ts

Object.defineProperty(window, 'IntersectionObserver', {
  value: global.IntersectionObserver,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'matchMedia', {
  value: global.matchMedia,
  writable: true,
  configurable: true,
});
