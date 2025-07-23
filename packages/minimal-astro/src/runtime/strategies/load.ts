/**
 * client:load hydration strategy
 * Hydrates components immediately when the script loads
 */

import type { createEventSystem } from '../event-system.js';
import type { PendingHydration } from '../types.js';

/**
 * RequestIdleCallback polyfill
 */
const requestIdleCallback =
  (typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as { requestIdleCallback?: typeof window.requestIdleCallback }).requestIdleCallback
    : null) ||
  ((
    callback: (deadline: {
      didTimeout: boolean;
      timeRemaining: () => number;
    }) => void,
    options?: { timeout?: number }
  ) => {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, options?.timeout ?? 1);
  });

/**
 * Schedule immediate hydration using requestIdleCallback for better performance
 */
export function scheduleLoad(
  pending: PendingHydration,
  performHydration: (pending: PendingHydration) => void,
  eventSystem: ReturnType<typeof createEventSystem>
): void {
  const componentId = pending.element.id;

  eventSystem.emit('before-hydrate', {
    componentId,
    element: pending.element,
    props: pending.props,
    directive: 'load',
  });

  requestIdleCallback(() => {
    try {
      performHydration(pending);
    } catch (error) {
      eventSystem.emit('hydration-error', {
        componentId,
        element: pending.element,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  });
}
