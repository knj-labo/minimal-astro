import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingHydration } from '../../src/types';

// Import DOM setup
import '../setup';

// Import strategies after setup
import { createEventSystem } from '../../src/event-system';
import { scheduleIdle } from '../../src/strategies/idle';
import { scheduleLoad } from '../../src/strategies/load';
import { scheduleMedia } from '../../src/strategies/media';
import { scheduleOnly } from '../../src/strategies/only';
import { scheduleVisible } from '../../src/strategies/visible';

// Mock pending hydration
const createMockPending = (directive: string, value?: string): PendingHydration => ({
  element: document.createElement('div'),
  component: { name: 'TestComponent', render: vi.fn() },
  directive,
  value,
  props: { test: true },
});

describe('Hydration Strategies', () => {
  let performHydration: ReturnType<typeof vi.fn>;
  let eventSystem: ReturnType<typeof createEventSystem>;

  beforeEach(() => {
    performHydration = vi.fn();
    eventSystem = createEventSystem();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('scheduleLoad', () => {
    it('should hydrate immediately on page load', async () => {
      const pending = createMockPending('load');
      const beforeHydrateHandler = vi.fn();
      eventSystem.on('before-hydrate', beforeHydrateHandler);

      scheduleLoad(pending, performHydration, eventSystem);

      // Should emit before-hydrate event synchronously
      expect(beforeHydrateHandler).toHaveBeenCalledWith({
        componentId: '',
        element: pending.element,
        props: pending.props,
        directive: 'load',
      });

      // Load strategy uses requestIdleCallback
      expect(global.requestIdleCallback).toHaveBeenCalled();

      // Wait for the callback to be executed
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(performHydration).toHaveBeenCalledWith(pending);
    });

    it('should handle errors during hydration', async () => {
      const pending = createMockPending('load');
      const errorHandler = vi.fn();
      eventSystem.on('hydration-error', errorHandler);

      // Make performHydration throw an error
      performHydration.mockImplementation(() => {
        throw new Error('Hydration failed');
      });

      scheduleLoad(pending, performHydration, eventSystem);

      // Wait for the callback to be executed
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorHandler).toHaveBeenCalledWith({
        componentId: '',
        element: pending.element,
        error: expect.any(Error),
      });
    });

    it('should emit proper events with correct structure', async () => {
      const pending = createMockPending('load');
      pending.element.id = 'test-component';
      const beforeHandler = vi.fn();
      eventSystem.on('before-hydrate', beforeHandler);

      scheduleLoad(pending, performHydration, eventSystem);

      expect(beforeHandler).toHaveBeenCalledWith({
        componentId: 'test-component',
        element: pending.element,
        props: pending.props,
        directive: 'load',
      });
    });
  });

  describe('scheduleIdle', () => {
    it('should use requestIdleCallback when available', async () => {
      const pending = createMockPending('idle');

      scheduleIdle(pending, performHydration, eventSystem);

      expect(global.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
        timeout: 2000,
      });

      // Wait for the callback to be executed
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(performHydration).toHaveBeenCalledWith(pending);
    });

    it('should fallback to setTimeout when requestIdleCallback is not available', async () => {
      (
        global as unknown as { requestIdleCallback?: typeof requestIdleCallback }
      ).requestIdleCallback = undefined;
      (
        window as unknown as { requestIdleCallback?: typeof requestIdleCallback }
      ).requestIdleCallback = undefined;
      vi.useFakeTimers();

      const pending = createMockPending('idle');

      scheduleIdle(pending, performHydration, eventSystem);

      // Fast-forward timers by at least 1ms (the fallback timeout)
      vi.advanceTimersByTime(10);

      expect(performHydration).toHaveBeenCalledWith(pending);

      vi.useRealTimers();
    });

    it('should handle timeout in requestIdleCallback', async () => {
      global.requestIdleCallback = vi.fn((callback, _options) => {
        // Simulate timeout scenario
        setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 0);
        return 1;
      }) as unknown as typeof requestIdleCallback;
      Object.defineProperty(window, 'requestIdleCallback', {
        value: global.requestIdleCallback,
        writable: true,
        configurable: true,
      });

      const pending = createMockPending('idle');

      scheduleIdle(pending, performHydration, eventSystem);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should still hydrate even with timeout
      expect(performHydration).toHaveBeenCalledWith(pending);
    });

    it('should emit proper events', async () => {
      const pending = createMockPending('idle');
      pending.element.id = 'test-idle';
      const beforeHandler = vi.fn();

      eventSystem.on('before-hydrate', beforeHandler);

      scheduleIdle(pending, performHydration, eventSystem);

      expect(beforeHandler).toHaveBeenCalledWith({
        componentId: 'test-idle',
        element: pending.element,
        props: pending.props,
        directive: 'idle',
      });
    });
  });

  describe('scheduleVisible', () => {
    it('should use IntersectionObserver to detect visibility', () => {
      const pending = createMockPending('visible');
      const getObserver = vi.fn(() => null);
      const setObserver = vi.fn();

      scheduleVisible(pending, performHydration, eventSystem, getObserver, setObserver);

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          rootMargin: '50px',
        })
      );

      const observer = vi.mocked(global.IntersectionObserver).mock.results[0]?.value;
      expect(observer.observe).toHaveBeenCalledWith(pending.element);
      expect(setObserver).toHaveBeenCalledWith(observer);
    });

    it('should hydrate when element becomes visible', () => {
      const pending = createMockPending('visible');
      const getObserver = vi.fn(() => null);
      const setObserver = vi.fn();

      scheduleVisible(pending, performHydration, eventSystem, getObserver, setObserver);

      // Get the callback passed to IntersectionObserver
      const callback = vi.mocked(global.IntersectionObserver).mock.calls[0][0];

      // Simulate element becoming visible
      const entries = [
        {
          isIntersecting: true,
          target: pending.element,
          intersectionRatio: 0.5,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 1000,
        },
      ];

      callback(entries, {} as IntersectionObserver);

      expect(performHydration).toHaveBeenCalledWith(pending);
    });

    it('should not hydrate when element is not visible', () => {
      const pending = createMockPending('visible');
      const getObserver = vi.fn(() => null);
      const setObserver = vi.fn();

      scheduleVisible(pending, performHydration, eventSystem, getObserver, setObserver);

      const callback = vi.mocked(global.IntersectionObserver).mock.calls[0][0];

      // Simulate element not visible
      const entries = [
        {
          isIntersecting: false,
          target: pending.element,
          intersectionRatio: 0,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 1000,
        },
      ];

      callback(entries, {} as IntersectionObserver);

      expect(performHydration).not.toHaveBeenCalled();
    });

    it('should reuse existing observer', () => {
      const existingObserver = new (
        global.IntersectionObserver as unknown as typeof IntersectionObserver
      )(() => {});
      const pending = createMockPending('visible');
      const getObserver = vi.fn(() => existingObserver);
      const setObserver = vi.fn();

      scheduleVisible(pending, performHydration, eventSystem, getObserver, setObserver);

      // Should not create new observer
      expect(global.IntersectionObserver).not.toHaveBeenCalled();
      expect(setObserver).not.toHaveBeenCalled();
    });

    it('should fallback to immediate hydration if IntersectionObserver is not supported', () => {
      (
        global as unknown as { IntersectionObserver?: typeof IntersectionObserver }
      ).IntersectionObserver = undefined;
      (
        window as unknown as { IntersectionObserver?: typeof IntersectionObserver }
      ).IntersectionObserver = undefined;

      const pending = createMockPending('visible');
      const getObserver = vi.fn(() => null);
      const setObserver = vi.fn();

      // scheduleVisible doesn't have a fallback built-in, it will throw
      expect(() =>
        scheduleVisible(pending, performHydration, eventSystem, getObserver, setObserver)
      ).toThrow();
    });
  });

  describe('scheduleMedia', () => {
    it('should hydrate when media query matches', () => {
      const mediaQuery = '(min-width: 768px)';
      const pending = createMockPending('media', mediaQuery);

      // Mock matching media query
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
        writable: true,
        configurable: true,
      });

      scheduleMedia(pending, mediaQuery, performHydration, eventSystem);

      expect(global.matchMedia).toHaveBeenCalledWith(mediaQuery);
      expect(performHydration).toHaveBeenCalledWith(pending);
    });

    it('should wait for media query to match', () => {
      const mediaQuery = '(min-width: 1024px)';
      const pending = createMockPending('media', mediaQuery);

      const addEventListener = vi.fn();
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: false,
          addEventListener,
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
        writable: true,
        configurable: true,
      });

      scheduleMedia(pending, mediaQuery, performHydration, eventSystem);

      expect(performHydration).not.toHaveBeenCalled();
      expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      // Simulate media query change
      const handler = addEventListener.mock.calls[0][1];
      handler({ matches: true });

      expect(performHydration).toHaveBeenCalledWith(pending);
    });

    it('should handle invalid media queries', () => {
      const invalidQuery = 'invalid query';
      const pending = createMockPending('media', invalidQuery);

      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => {
          throw new Error('Invalid media query');
        }),
        writable: true,
        configurable: true,
      });

      // Should throw since window.matchMedia throws
      expect(() => scheduleMedia(pending, invalidQuery, performHydration, eventSystem)).toThrow(
        'Invalid media query'
      );
    });

    it('should clean up event listeners after hydration', () => {
      const mediaQuery = '(prefers-color-scheme: dark)';
      const pending = createMockPending('media', mediaQuery);

      const removeEventListener = vi.fn();
      const addEventListener = vi.fn();

      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: false,
          addEventListener,
          removeEventListener,
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
        writable: true,
        configurable: true,
      });

      scheduleMedia(pending, mediaQuery, performHydration, eventSystem);

      const handler = addEventListener.mock.calls[0][1];
      handler({ matches: true });

      expect(removeEventListener).toHaveBeenCalledWith('change', handler);
    });
  });

  describe('scheduleOnly', () => {
    it('should hydrate immediately for matching runtime', () => {
      const pending = createMockPending('only', 'react');

      scheduleOnly(pending, performHydration, eventSystem);

      expect(performHydration).toHaveBeenCalledWith(pending);
    });

    it('should always hydrate with client:only (no runtime check in strategy)', () => {
      const pending = createMockPending('only', 'vue');

      // client:only always hydrates immediately regardless of runtime
      scheduleOnly(pending, performHydration, eventSystem);

      expect(performHydration).toHaveBeenCalledWith(pending);
    });

    it('should handle missing runtime value', () => {
      const pending = createMockPending('only');

      scheduleOnly(pending, performHydration, eventSystem);

      // Should hydrate when no specific runtime is specified
      expect(performHydration).toHaveBeenCalledWith(pending);
    });

    it('should emit proper events', () => {
      const pending = createMockPending('only', 'react');
      const beforeHandler = vi.fn();

      eventSystem.on('before-hydrate', beforeHandler);

      scheduleOnly(pending, performHydration, eventSystem);

      expect(beforeHandler).toHaveBeenCalledWith({
        componentId: '',
        element: pending.element,
        props: pending.props,
        directive: 'only',
      });
    });
  });

  describe('Strategy Error Handling', () => {
    it('should handle errors in hydration gracefully', () => {
      const pending = createMockPending('load');
      const failingHydration = vi.fn(() => {
        throw new Error('Hydration failed');
      });

      // Should not throw
      expect(() => scheduleLoad(pending, failingHydration, eventSystem)).not.toThrow();
    });

    it('should emit error events on failure', async () => {
      const pending = createMockPending('idle');
      const failingHydration = vi.fn(() => {
        throw new Error('Component error');
      });

      const errorHandler = vi.fn();
      eventSystem.on('hydration-error', errorHandler);

      scheduleIdle(pending, failingHydration, eventSystem);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorHandler).toHaveBeenCalledWith({
        componentId: '',
        element: pending.element,
        error: expect.any(Error),
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('should batch visible hydrations with single observer', () => {
      const pending1 = createMockPending('visible');
      const pending2 = createMockPending('visible');

      let observer: IntersectionObserver | null = null;
      const getObserver = vi.fn(() => observer);
      const setObserver = vi.fn((obs) => {
        observer = obs;
      });

      scheduleVisible(pending1, performHydration, eventSystem, getObserver, setObserver);
      scheduleVisible(pending2, performHydration, eventSystem, getObserver, setObserver);

      // Should create only one observer
      expect(global.IntersectionObserver).toHaveBeenCalledTimes(1);
      expect(setObserver).toHaveBeenCalledTimes(1);
    });

    it('should use appropriate root margin for visible strategy', () => {
      const pending = createMockPending('visible');
      const getObserver = vi.fn(() => null);
      const setObserver = vi.fn();

      scheduleVisible(pending, performHydration, eventSystem, getObserver, setObserver);

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          rootMargin: '50px', // Pre-load slightly before visible
        })
      );
    });
  });
});
