/**
 * client:idle hydration strategy
 * Hydrates components when the browser is idle
 */

import type { createEventSystem } from '../event-system.js';
import type { PendingHydration } from '../types.js';

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleRequestCallback = (
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout?: number }
) => number;

/**
 * RequestIdleCallback polyfill
 */
const requestIdleCallback: IdleRequestCallback =
  (typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as Window & { requestIdleCallback: IdleRequestCallback }).requestIdleCallback
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
 * Schedule hydration when browser is idle with a 2 second timeout
 */
export function scheduleIdle(
  pending: PendingHydration,
  performHydration: (pending: PendingHydration) => void,
  eventSystem: ReturnType<typeof createEventSystem>
): void {
  const componentId = pending.element.id;

  eventSystem.emit('before-hydrate', {
    componentId,
    element: pending.element,
    props: pending.props,
    directive: 'idle',
  });

  requestIdleCallback(
    () => {
      try {
        performHydration(pending);
      } catch (error) {
        eventSystem.emit('hydration-error', {
          componentId,
          element: pending.element,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },
    { timeout: 2000 }
  );
}
