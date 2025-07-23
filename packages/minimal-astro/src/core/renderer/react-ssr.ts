/**
 * React SSR renderer for Astro components
 * Implements proper server-side rendering with React 18
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import type { ComponentNode, Node } from '../../types/ast.js';
import { createContextualLogger } from '../utils/logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ReactSSROptions {
  /**
   * Component registry for resolving imports
   */
  components?: Map<string, React.ComponentType<any>>;

  /**
   * Props to pass to components
   */
  props?: Record<string, unknown>;

  /**
   * Whether to include hydration data
   */
  generateHydrationData?: boolean;

  /**
   * Development mode (includes extra debugging)
   */
  dev?: boolean;
}

export interface SSRResult {
  /**
   * Rendered HTML string
   */
  html: string;

  /**
   * Hydration data for client-side
   */
  hydrationData?: HydrationData;

  /**
   * Error that occurred during rendering
   */
  error?: Error;
}

export interface HydrationData {
  /**
   * Component ID
   */
  id: string;

  /**
   * Component name/path
   */
  component: string;

  /**
   * Props passed to the component
   */
  props: Record<string, unknown>;

  /**
   * Client directive configuration
   */
  directive?: {
    type: 'load' | 'idle' | 'visible' | 'media' | 'only';
    value?: string;
  };
}

// ============================================================================
// COMPONENT WRAPPER
// ============================================================================

/**
 * Creates a wrapper component for hydration
 */
function createHydrationWrapper(
  Component: React.ComponentType<any>,
  props: Record<string, unknown>,
  hydrationData?: HydrationData
): React.ReactElement {
  // Create a wrapper that includes hydration markers
  const WrapperComponent: React.FC = () => {
    const element = React.createElement(Component, props);

    if (hydrationData) {
      // Wrap with hydration marker
      return React.createElement(
        'astro-island',
        {
          'component-export': hydrationData.component,
          'component-props': JSON.stringify(hydrationData.props),
          'client-directive': hydrationData.directive?.type,
          'client-directive-value': hydrationData.directive?.value,
          'data-astro-cid': hydrationData.id,
        },
        element
      );
    }

    return element;
  };

  return React.createElement(WrapperComponent);
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SSRErrorBoundary extends React.Component<
  { children: React.ReactNode; componentName: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; componentName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const logger = createContextualLogger({ module: 'react-ssr' });
    logger.error(`Error rendering ${this.props.componentName}`, error, { errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Return a fallback UI for SSR
      return React.createElement(
        'div',
        {
          'data-astro-component-error': this.props.componentName,
          style: { display: 'none' },
        },
        `<!-- Error rendering ${this.props.componentName}: ${this.state.error?.message} -->`
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

/**
 * Renders a React component to HTML string with optional hydration data
 */
export function renderReactComponent(
  componentName: string,
  componentExport: React.ComponentType<any>,
  props: Record<string, unknown> = {},
  options: ReactSSROptions = {}
): SSRResult {
  const logger = createContextualLogger({ module: 'react-ssr' });

  try {
    // Filter out client directives from props
    const componentProps = Object.entries(props).reduce(
      (acc, [key, value]) => {
        if (!key.startsWith('client:')) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>
    );

    // Generate hydration data if requested
    let hydrationData: HydrationData | undefined;
    if (options.generateHydrationData) {
      hydrationData = {
        id: generateComponentId(componentName),
        component: componentName,
        props: componentProps, // Use filtered props
        directive: extractClientDirective(props),
      };
    }

    // Create the component element with filtered props
    const element = createHydrationWrapper(componentExport, componentProps, hydrationData);

    // Wrap in error boundary for SSR safety
    const wrappedElement = React.createElement(SSRErrorBoundary, {
      componentName,
      children: element,
    });

    // Render to string
    const html = renderToString(wrappedElement);

    logger.debug(`Successfully rendered ${componentName}`, {
      propsCount: Object.keys(props).length,
      hasHydration: !!hydrationData,
    });

    return {
      html,
      hydrationData,
    };
  } catch (error) {
    const renderError = error instanceof Error ? error : new Error(String(error));

    logger.error(`Failed to render React component ${componentName}`, renderError, { props });

    // Return a safe fallback
    return {
      html: `<!-- Error rendering ${componentName}: ${renderError.message} -->`,
      error: renderError,
    };
  }
}

/**
 * Renders a React component from AST node
 */
export function renderReactComponentFromNode(
  node: ComponentNode,
  options: ReactSSROptions = {}
): SSRResult {
  const { components = new Map() } = options;
  const componentName = node.tag;

  // Look up the component
  const Component = components.get(componentName);
  if (!Component) {
    const error = new Error(`Component "${componentName}" not found in registry`);
    return {
      html: `<!-- Component ${componentName} not found -->`,
      error,
    };
  }

  // Extract props from node attributes
  const props = extractPropsFromNode(node);

  return renderReactComponent(componentName, Component, props, options);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extracts props from AST component node
 */
function extractPropsFromNode(node: ComponentNode): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const attr of node.attrs || []) {
    if (attr.name.startsWith('client:')) {
      // Skip client directives, handle separately
      continue;
    }

    // Parse attribute value
    if (attr.value) {
      try {
        // Try to parse as JSON for complex values
        if (
          typeof attr.value === 'string' &&
          (attr.value.startsWith('{') || attr.value.startsWith('['))
        ) {
          props[attr.name] = JSON.parse(attr.value);
        } else {
          props[attr.name] = attr.value;
        }
      } catch {
        // Fallback to string value
        props[attr.name] = attr.value;
      }
    } else {
      // Boolean attribute
      props[attr.name] = true;
    }
  }

  return props;
}

/**
 * Extracts client directive from props
 */
function extractClientDirective(props: Record<string, unknown>): HydrationData['directive'] {
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('client:')) {
      const directiveType = key.slice(7) as HydrationData['directive']['type'];
      return {
        type: directiveType,
        value: typeof value === 'string' ? value : undefined,
      };
    }
  }
  return undefined;
}

/**
 * Generates a unique component ID for hydration
 */
function generateComponentId(componentName: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${componentName}-${timestamp}-${random}`;
}

/**
 * Creates a React SSR renderer with configured options
 */
export function createReactSSRRenderer(options: ReactSSROptions = {}) {
  return {
    /**
     * Render a component by name
     */
    render(componentName: string, props: Record<string, unknown> = {}): SSRResult {
      const Component = options.components?.get(componentName);
      if (!Component) {
        return {
          html: `<!-- Component ${componentName} not found -->`,
          error: new Error(`Component "${componentName}" not found`),
        };
      }

      return renderReactComponent(componentName, Component, props, options);
    },

    /**
     * Render from AST node
     */
    renderNode(node: ComponentNode): SSRResult {
      return renderReactComponentFromNode(node, options);
    },

    /**
     * Register a component
     */
    register(name: string, component: React.ComponentType<any>): void {
      if (!options.components) {
        options.components = new Map();
      }
      options.components.set(name, component);
    },

    /**
     * Get all registered components
     */
    getComponents(): Map<string, React.ComponentType<any>> {
      return options.components || new Map();
    },
  };
}
