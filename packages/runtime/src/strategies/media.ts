/**
 * client:media hydration strategy
 * Hydrates components when a media query matches
 */

import type { createEventSystem } from '../event-system.js';
import type { PendingHydration } from '../types.js';

/**
 * Schedule hydration when media query matches
 */
export function scheduleMedia(
  pending: PendingHydration,
  query: string,
  performHydration: (pending: PendingHydration) => void,
  eventSystem: ReturnType<typeof createEventSystem>
): void {
  const componentId = pending.element.id;

  eventSystem.emit('before-hydrate', {
    componentId,
    element: pending.element,
    props: pending.props,
    directive: 'media',
  });

  const mediaQuery = window.matchMedia(query);

  const checkAndHydrate = () => {
    if (mediaQuery.matches) {
      try {
        performHydration(pending);
        // Remove listener after hydration
        mediaQuery.removeEventListener('change', checkAndHydrate);
      } catch (error) {
        eventSystem.emit('hydration-error', {
          componentId,
          element: pending.element,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  };

  // Check immediately
  checkAndHydrate();

  // Listen for changes if not already matched
  if (!mediaQuery.matches) {
    mediaQuery.addEventListener('change', checkAndHydrate);
  }
}
