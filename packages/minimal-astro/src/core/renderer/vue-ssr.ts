/**
 * Vue SSR renderer for Astro components
 * Implements server-side rendering with Vue 3
 */

import type { ComponentNode } from '@minimal-astro/types/ast';
import { createContextualLogger } from '../utils/logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface VueSSROptions {
  /**
   * Component registry for resolving imports
   */
  components?: Map<string, unknown>;

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

export interface VueSSRResult {
  /**
   * Rendered HTML string
   */
  html: string;

  /**
   * Hydration data for client-side
   */
  hydrationData?: VueHydrationData;

  /**
   * Error that occurred during rendering
   */
  error?: Error;
}

export interface VueHydrationData {
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
// MAIN RENDERER
// ============================================================================

/**
 * Renders a Vue component to HTML string with optional hydration data
 * Note: This is a simplified implementation. For production, you'd use @vue/server-renderer
 */
export async function renderVueComponent(
  componentName: string,
  VueComponent: unknown,
  props: Record<string, unknown> = {},
  options: VueSSROptions = {}
): Promise<VueSSRResult> {
  const logger = createContextualLogger({ module: 'vue-ssr' });

  try {
    // Generate hydration data if requested
    let hydrationData: VueHydrationData | undefined;
    if (options.generateHydrationData) {
      hydrationData = {
        id: generateComponentId(componentName),
        component: componentName,
        props,
        directive: extractClientDirective(props),
      };
    }

    let html: string;

    // Try to use Vue's SSR if available
    try {
      // Dynamic import to avoid hard dependency
      const vueModule = await import('vue');
      const vueServerRenderer = await import('@vue/server-renderer');
      const { createSSRApp, h } = vueModule;
      const { renderToString } = vueServerRenderer;

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

      // Create Vue SSR app
      const app = createSSRApp({
        render() {
          return h(VueComponent, componentProps);
        },
      });

      // Render to string
      html = await renderToString(app);
    } catch (vueError) {
      // Fallback to simplified rendering if Vue SSR not available
      logger.debug(`Vue SSR not available, using fallback for ${componentName}`, vueError);

      const componentTag = componentName.toLowerCase().replace(/([A-Z])/g, '-$1');
      const propsString = Object.entries(props)
        .filter(([key]) => !key.startsWith('client:'))
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key}="${escapeHtml(value)}"`;
          }
          return `${key}="${escapeHtml(JSON.stringify(value))}"`;
        })
        .join(' ');

      html = `<${componentTag}${propsString ? ` ${propsString}` : ''}></${componentTag}>`;
    }

    // Wrap with hydration island if needed
    if (hydrationData) {
      // Include hydration wrapper
      const propsWithoutDirectives = Object.entries(props).reduce(
        (acc, [key, value]) => {
          if (!key.startsWith('client:')) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, unknown>
      );

      html = `<astro-island component-export="${componentName}" component-props="${escapeHtml(JSON.stringify(propsWithoutDirectives))}" client-directive="${hydrationData.directive?.type || ''}" data-astro-cid="${hydrationData.id}">
				${html}
			</astro-island>`;
    }

    logger.debug(`Successfully rendered Vue component ${componentName}`, {
      propsCount: Object.keys(props).length,
      hasHydration: !!hydrationData,
    });

    return {
      html,
      hydrationData,
    };
  } catch (error) {
    const renderError = error instanceof Error ? error : new Error(String(error));

    logger.error(`Failed to render Vue component ${componentName}`, renderError, { props });

    return {
      html: `<!-- Error rendering ${componentName}: ${renderError.message} -->`,
      error: renderError,
    };
  }
}

/**
 * Renders a Vue component from AST node
 */
export async function renderVueComponentFromNode(
  node: ComponentNode,
  options: VueSSROptions = {}
): Promise<VueSSRResult> {
  const { components = new Map() } = options;
  const componentName = node.tag;

  // Look up the component
  const Component = components.get(componentName);
  if (!Component) {
    const error = new Error(`Vue component "${componentName}" not found in registry`);
    return {
      html: `<!-- Vue component ${componentName} not found -->`,
      error,
    };
  }

  // Extract props from node attributes
  const props = extractPropsFromNode(node);

  return renderVueComponent(componentName, Component, props, options);
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
      continue;
    }

    if (attr.value) {
      try {
        if (
          typeof attr.value === 'string' &&
          (attr.value.startsWith('{') || attr.value.startsWith('['))
        ) {
          props[attr.name] = JSON.parse(attr.value);
        } else {
          props[attr.name] = attr.value;
        }
      } catch {
        props[attr.name] = attr.value;
      }
    } else {
      props[attr.name] = true;
    }
  }

  return props;
}

/**
 * Extracts client directive from props
 */
function extractClientDirective(props: Record<string, unknown>): VueHydrationData['directive'] {
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('client:')) {
      const directiveType = key.slice(7) as VueHydrationData['directive']['type'];
      return {
        type: directiveType,
        value: typeof value === 'string' ? value : undefined,
      };
    }
  }
  return undefined;
}

/**
 * Escapes HTML entities
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generates a unique component ID for hydration
 */
function generateComponentId(componentName: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `vue-${componentName}-${timestamp}-${random}`;
}

/**
 * Creates a Vue SSR renderer with configured options
 */
export function createVueSSRRenderer(options: VueSSROptions = {}) {
  return {
    /**
     * Render a component by name
     */
    async render(
      componentName: string,
      props: Record<string, unknown> = {}
    ): Promise<VueSSRResult> {
      const Component = options.components?.get(componentName);
      if (!Component) {
        return {
          html: `<!-- Vue component ${componentName} not found -->`,
          error: new Error(`Component "${componentName}" not found`),
        };
      }

      return renderVueComponent(componentName, Component, props, options);
    },

    /**
     * Render from AST node
     */
    async renderNode(node: ComponentNode): Promise<VueSSRResult> {
      return renderVueComponentFromNode(node, options);
    },

    /**
     * Register a component
     */
    register(name: string, component: unknown): void {
      if (!options.components) {
        options.components = new Map();
      }
      options.components.set(name, component);
    },

    /**
     * Get all registered components
     */
    getComponents(): Map<string, unknown> {
      return options.components || new Map();
    },
  };
}
