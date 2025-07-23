/**
 * client:only hydration strategy
 * Hydrates components immediately (client-only components)
 */

import type { createEventSystem } from '../event-system.js';
import type { PendingHydration } from '../types.js';

/**
 * Schedule immediate hydration for client-only components
 */
export function scheduleOnly(
  pending: PendingHydration,
  performHydration: (pending: PendingHydration) => void,
  eventSystem: ReturnType<typeof createEventSystem>
): void {
  const componentId = pending.element.id;

  eventSystem.emit('before-hydrate', {
    componentId,
    element: pending.element,
    props: pending.props,
    directive: 'only',
  });

  try {
    performHydration(pending);
  } catch (error) {
    eventSystem.emit('hydration-error', {
      componentId,
      element: pending.element,
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }
}
