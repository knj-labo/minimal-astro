/**
 * React SSR renderer for Astro components
 * Implements proper server-side rendering with React 18
 */
import { createContextualLogger } from '@minimal-astro/internal-helpers';
import React from 'react';
import { renderToString } from 'react-dom/server';
// ============================================================================
// COMPONENT WRAPPER
// ============================================================================
/**
 * Creates a wrapper component for hydration
 */
function createHydrationWrapper(Component, props, hydrationData) {
  // Create a wrapper that includes hydration markers
  const WrapperComponent = () => {
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
class SSRErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
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
export function renderReactComponent(componentName, componentExport, props = {}, options = {}) {
  const logger = createContextualLogger({ module: 'react-ssr' });
  try {
    // Generate hydration data if requested
    let hydrationData;
    if (options.generateHydrationData) {
      hydrationData = {
        id: generateComponentId(componentName),
        component: componentName,
        props,
        directive: extractClientDirective(props),
      };
    }
    // Create the component element
    const element = createHydrationWrapper(componentExport, props, hydrationData);
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
export function renderReactComponentFromNode(node, options = {}) {
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
function extractPropsFromNode(node) {
  const props = {};
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
function extractClientDirective(props) {
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('client:')) {
      const directiveType = key.slice(7);
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
function generateComponentId(componentName) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${componentName}-${timestamp}-${random}`;
}
/**
 * Creates a React SSR renderer with configured options
 */
export function createReactSSRRenderer(options = {}) {
  return {
    /**
     * Render a component by name
     */
    render(componentName, props = {}) {
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
    renderNode(node) {
      return renderReactComponentFromNode(node, options);
    },
    /**
     * Register a component
     */
    register(name, component) {
      if (!options.components) {
        options.components = new Map();
      }
      options.components.set(name, component);
    },
    /**
     * Get all registered components
     */
    getComponents() {
      return options.components || new Map();
    },
  };
}
//# sourceMappingURL=ssr.js.map
