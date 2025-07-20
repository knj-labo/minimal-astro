/**
 * @minimal-astro/runtime
 *
 * Chapter 6: Selective Hydration Strategies
 * Refactored hydration runtime with:
 * - Simple function organization by responsibility
 * - Event system for framework lifecycle hooks
 * - Immutable state management
 * - Strategy pattern for hydration directives
 */

// Main hydration runtime exports
export {
  createHydrationRuntime,
  autoHydrate,
  hydrate,
} from './hydrate.js';

// Type exports
export type {
  ComponentType,
  HydrationOptions,
  PendingHydration,
  HydrationState,
  HydrationRuntime,
  FrameworkHooks,
} from './types.js';

export type { HydrationEvents } from './event-system.js';

// Utility exports for advanced usage
export {
  createEventSystem,
  registerFrameworkHooks,
} from './event-system.js';

export {
  createInitialState,
  markAsHydrated,
  addPending,
  removeFromHydrated,
} from './state-management.js';

export {
  getHydrationData,
  validateHydrationRequirements,
  isComponentHydrated,
} from './data-access.js';

export {
  createDefaultRenderer,
  isReactAvailable,
  isPreactAvailable,
} from './framework-renderers.js';

// Strategy exports for custom implementations
export { scheduleLoad } from './strategies/load.js';
export { scheduleIdle } from './strategies/idle.js';
export { scheduleVisible } from './strategies/visible.js';
export { scheduleMedia } from './strategies/media.js';
export { scheduleOnly } from './strategies/only.js';
