/**
 * Types for Universal SSR renderer
 */

export type FrameworkType = 'react' | 'vue' | 'svelte' | 'auto';

export interface UniversalSSROptions {
  /**
   * Component registries for each framework
   */
  components?: {
    react?: Map<string, any>;
    vue?: Map<string, any>;
    svelte?: Map<string, any>;
  };

  /**
   * Props to pass to components
   */
  props?: Record<string, unknown>;

  /**
   * Framework to use ('auto' will detect from component)
   */
  framework?: FrameworkType;
}

export interface UniversalSSRResult {
  /**
   * Rendered HTML output
   */
  html: string;

  /**
   * Framework that was used
   */
  framework: FrameworkType;

  /**
   * Any error that occurred
   */
  error?: Error;
}

export interface FrameworkRenderer {
  renderComponent: (component: any, props: any) => Promise<string>;
  createRenderer: (options: unknown) => unknown;
}
