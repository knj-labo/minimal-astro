/**
 * Immutable state management helpers for hydration runtime
 */

import type { HydrationState, PendingHydration } from './types.js';

/**
 * Create initial hydration state
 */
export function createInitialState(): HydrationState {
  return {
    hydrated: new Set(),
    pending: new Map(),
    observers: {},
  } as const;
}

/**
 * Mark a component as hydrated and remove it from pending
 */
export function markAsHydrated(state: HydrationState, componentId: string): HydrationState {
  const newPending = new Map(state.pending);
  newPending.delete(componentId);

  return {
    ...state,
    hydrated: new Set([...state.hydrated, componentId]),
    pending: newPending,
  } as const;
}

/**
 * Add a pending hydration
 */
export function addPending(
  state: HydrationState,
  componentId: string,
  pending: PendingHydration
): HydrationState {
  const newPending = new Map(state.pending);
  newPending.set(componentId, pending);

  return {
    ...state,
    pending: newPending,
  } as const;
}

/**
 * Remove a pending hydration
 */
export function removePending(state: HydrationState, componentId: string): HydrationState {
  const newPending = new Map(state.pending);
  newPending.delete(componentId);

  return {
    ...state,
    pending: newPending,
  } as const;
}

/**
 * Remove a component from hydrated set (for retry scenarios)
 */
export function removeFromHydrated(state: HydrationState, componentId: string): HydrationState {
  const newHydrated = new Set(state.hydrated);
  newHydrated.delete(componentId);

  return {
    ...state,
    hydrated: newHydrated,
  } as const;
}

/**
 * Set intersection observer
 */
export function setIntersectionObserver(
  state: HydrationState,
  observer: IntersectionObserver
): HydrationState {
  return {
    ...state,
    observers: {
      ...state.observers,
      intersection: observer,
    },
  } as const;
}

/**
 * Set mutation observer
 */
export function setMutationObserver(
  state: HydrationState,
  observer: MutationObserver
): HydrationState {
  return {
    ...state,
    observers: {
      ...state.observers,
      mutation: observer,
    },
  } as const;
}

/**
 * Clear all observers
 */
export function clearObservers(state: HydrationState): HydrationState {
  // Disconnect existing observers
  if (state.observers.intersection) {
    state.observers.intersection.disconnect();
  }
  if (state.observers.mutation) {
    state.observers.mutation.disconnect();
  }

  return {
    ...state,
    observers: {},
  } as const;
}
