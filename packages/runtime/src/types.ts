/**
 * Core types for the hydration runtime
 */

// Type-only imports for component types
export type ComponentType<P = Record<string, unknown>> = (props: P) => unknown;

export interface HydrationOptions {
  /**
   * Root element selector or element
   */
  root?: string | HTMLElement;

  /**
   * Component registry
   */
  components: Map<string, ComponentType>;

  /**
   * React, Preact, or vanilla/test for testing
   */
  runtime: 'react' | 'preact' | 'vanilla' | 'test' | string;

  /**
   * Custom render function
   */
  render?: (component: ComponentType, container: HTMLElement) => void;
}

export interface PendingHydration {
  element: HTMLElement;
  component: ComponentType;
  props: Record<string, unknown>;
  directive: string;
  value?: string;
}

export interface HydrationState {
  readonly hydrated: ReadonlySet<string>;
  readonly pending: ReadonlyMap<string, PendingHydration>;
  readonly observers: {
    readonly intersection?: IntersectionObserver;
    readonly mutation?: MutationObserver;
  };
}

export interface HydrationRuntime {
  hydrateAll: () => void;
  hydrateComponent: (element: HTMLElement, immediate?: boolean) => void;
  cleanup: () => void;
  context: HydrationState;
}

// Re-export FrameworkHooks from event-system
export type { FrameworkHooks } from './event-system.js';
