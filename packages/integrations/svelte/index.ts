/**
 * Svelte renderer for Astro components
 * Handles SSR and client-side rendering with hydration support
 */

import { createContextualLogger } from '@minimal-astro/compiler/src/utils/logger.js';
import type {
  ComponentNode,
  ElementNode,
  ExpressionNode,
  FragmentNode,
  FrontmatterNode,
  Node,
  TextNode,
} from '@minimal-astro/compiler/types/ast.js';

// Component type definition for Svelte
// biome-ignore lint/suspicious/noExplicitAny: Svelte component types vary significantly
type SvelteComponent = any; // Svelte component type

export interface SvelteRendererOptions {
  /**
   * Mode of rendering
   */
  mode: 'ssr' | 'client';

  /**
   * Whether to include hydration markers
   */
  hydrate?: boolean;

  /**
   * Component registry for resolving imports
   */
  components?: Map<string, SvelteComponent>;

  /**
   * Props to pass to the root component
   */
  props?: Record<string, unknown>;
}

export interface SvelteRenderResult {
  /**
   * The rendered HTML string (SSR) or Svelte component (client)
   */
  output: string | unknown;

  /**
   * Hydration data for client-side
   */
  hydrationData?: SvelteHydrationData;

  /**
   * Scripts needed for hydration
   */
  scripts?: string[];
}

export interface SvelteHydrationData {
  /**
   * Component props for hydration
   */
  props: Record<string, unknown>;

  /**
   * Client directives and their configurations
   */
  directives: SvelteClientDirective[];

  /**
   * Component paths for lazy loading
   */
  componentPaths: Record<string, string>;
}

export interface SvelteClientDirective {
  /**
   * The directive type
   */
  type: 'load' | 'idle' | 'visible' | 'media' | 'only';

  /**
   * Directive value (e.g., media query)
   */
  value?: string;

  /**
   * Component ID for hydration
   */
  componentId: string;

  /**
   * Props to hydrate with
   */
  props: Record<string, unknown>;
}

/**
 * Creates a Svelte renderer for Astro components
 */
export function createSvelteRenderer(options: SvelteRendererOptions) {
  const { mode, hydrate = false, components = new Map(), props = {} } = options;

  // Create logger instance
  const logger = createContextualLogger({ renderer: 'svelte', mode });

  // Track hydration data
  const hydrationData: SvelteHydrationData = {
    props: {},
    directives: [],
    componentPaths: {},
  };

  // Component ID counter for hydration
  let componentIdCounter = 0;

  /**
   * Generate unique component ID
   */
  function generateComponentId(): string {
    return `svelte-${++componentIdCounter}`;
  }

  /**
   * Extract client directive from attributes
   */
  function extractClientDirective(
    attrs: Array<{ name: string; value: string | boolean }>
  ): SvelteClientDirective | null {
    const clientAttr = attrs.find((attr) => attr.name.startsWith('client:'));
    if (!clientAttr) return null;

    const directiveType = clientAttr.name.slice(7) as SvelteClientDirective['type'];
    const value = clientAttr.value;

    return {
      type: directiveType,
      value: value === true ? undefined : String(value),
      componentId: generateComponentId(),
      props: {},
    };
  }

  /**
   * Render AST node to Svelte
   */
  function renderNode(node: Node, context: Record<string, unknown> = {}): unknown {
    switch (node.type) {
      case 'Fragment':
        return renderFragment(node as FragmentNode, context);

      case 'Element':
        return renderElement(node as ElementNode, context);

      case 'Component':
        return renderComponent(node as ComponentNode, context);

      case 'Text':
        return renderText(node as TextNode, context);

      case 'Expression':
        return renderExpression(node as ExpressionNode, context);

      case 'Frontmatter':
        // Frontmatter is processed separately
        return null;

      default:
        return null;
    }
  }

  /**
   * Render fragment node
   */
  function renderFragment(node: FragmentNode, context: Record<string, unknown>): unknown {
    const children = node.children
      .map((child) => renderNode(child, context))
      .filter((child) => child !== null && child !== '');

    if (mode === 'ssr') {
      return children.join('').trim();
    }

    // For client mode, return Svelte fragment syntax
    if (children.length === 0) {
      return '';
    }
    if (children.length === 1) {
      return children[0];
    }
    return children.join('\n');
  }

  /**
   * Render HTML element
   */
  function renderElement(node: ElementNode, context: Record<string, unknown>): unknown {
    const { tag, attrs, children } = node;

    // Process attributes
    const attributes: Record<string, unknown> = {};
    for (const attr of attrs) {
      attributes[attr.name] = attr.value;
    }

    // Render children
    const renderedChildren = children.map((child) => renderNode(child, context)).filter(Boolean);

    if (mode === 'ssr') {
      // SSR: Generate HTML string
      const attrString = Object.entries(attributes)
        .map(([key, value]) => {
          if (value === true) return key;
          if (value === false) return '';
          return `${key}="${escapeHtml(String(value))}"`;
        })
        .filter(Boolean)
        .join(' ');

      const openTag = `<${tag}${attrString ? ` ${attrString}` : ''}>`;
      const closeTag = `</${tag}>`;

      if (isVoidElement(tag)) {
        return openTag;
      }

      return `${openTag}${renderedChildren.join('')}${closeTag}`;
    }

    // Client mode: Generate Svelte template syntax
    const attrString = Object.entries(attributes)
      .map(([key, value]) => {
        if (value === true) return key;
        if (value === false) return '';
        if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
          return `${key}=${value}`;
        }
        return `${key}="${value}"`;
      })
      .filter(Boolean)
      .join(' ');

    if (isVoidElement(tag)) {
      return `<${tag}${attrString ? ` ${attrString}` : ''} />`;
    }

    return `<${tag}${attrString ? ` ${attrString}` : ''}>${renderedChildren.join('')}</${tag}>`;
  }

  /**
   * Render component node
   */
  function renderComponent(node: ComponentNode, context: Record<string, unknown>): unknown {
    const { tag, attrs, children } = node;

    // Check for client directive
    const directive = extractClientDirective(attrs);

    // Process props
    const componentProps: Record<string, unknown> = {};
    for (const attr of attrs) {
      if (!attr.name.startsWith('client:')) {
        let value = attr.value;

        // If value is an expression (wrapped in braces), evaluate it
        if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
          const expression = value.slice(1, -1); // Remove braces
          try {
            const result = evaluateExpression(expression, context);
            value = result;
          } catch (error) {
            logger.warn('Failed to evaluate attribute expression', {
              expression,
              error: error instanceof Error ? error.message : String(error),
            });
            value = expression; // Fall back to the expression string
          }
        }

        componentProps[attr.name] = value;
      }
    }

    // Add children as slots
    if (children.length > 0) {
      componentProps.children = children.map((child) => renderNode(child, context)).filter(Boolean);
    }

    // Get component from registry
    const Component = components.get(tag);

    if (mode === 'ssr') {
      // Track hydration data if directive exists
      if (hydrate && directive) {
        const wrapperId = directive.componentId;
        hydrationData.directives.push({
          ...directive,
          props: componentProps,
        });

        if (!Component) {
          // Component not found, render placeholder with hydration marker
          return `<div id="${wrapperId}" data-astro-root data-astro-component="${tag}"><!-- Svelte Component: ${tag} --></div>`;
        }

        // Component found, render with hydration marker
        const html = renderSvelteComponentToString(Component, componentProps);
        return `<div id="${wrapperId}" data-astro-root data-astro-component="${tag}">${html}</div>`;
      }

      if (!Component) {
        // Component not found, render simple placeholder
        return `<!-- Svelte Component: ${tag} -->`;
      }

      // Component found, render normally
      const html = renderSvelteComponentToString(Component, componentProps);
      return html;
    }

    // Client mode: Generate Svelte component syntax
    const propsString = Object.entries(componentProps)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key}="${value}"`;
        }
        return `${key}={${JSON.stringify(value)}}`;
      })
      .join(' ');

    return `<${tag}${propsString ? ` ${propsString}` : ''} />`;
  }

  /**
   * Render text node
   */
  function renderText(node: TextNode, _context: Record<string, unknown>): unknown {
    const { value } = node;

    if (mode === 'ssr') {
      // Escape HTML entities in SSR mode for safety
      return escapeHtml(value);
    }

    return value;
  }

  /**
   * Render expression node
   */
  function renderExpression(node: ExpressionNode, context: Record<string, unknown>): unknown {
    const { code } = node;

    if (mode === 'ssr') {
      // Evaluate expression in context
      try {
        const result = evaluateExpression(code, context);
        return escapeHtml(String(result));
      } catch (error) {
        logger.warn('Expression evaluation error', {
          code,
          error: error instanceof Error ? error.message : String(error),
        });
        return `<!-- Expression error: ${escapeHtml(code)} -->`;
      }
    }

    // Client mode: Return Svelte expression syntax
    return `{${code}}`;
  }

  /**
   * Main render function
   */
  return {
    render(ast: FragmentNode): SvelteRenderResult {
      // Process frontmatter first
      const frontmatter = ast.children.find((child) => child.type === 'Frontmatter') as
        | FrontmatterNode
        | undefined;

      // Create render context
      const context = {
        ...props,
        ...(frontmatter ? processFrontmatter(frontmatter.code) : {}),
      };

      // Render the AST
      const output = renderNode(ast, context);

      // Generate hydration scripts if needed
      const scripts = hydrate ? generateSvelteHydrationScripts(hydrationData) : undefined;

      return {
        output,
        hydrationData: hydrate ? hydrationData : undefined,
        scripts,
      };
    },

    /**
     * Render a single component (useful for testing)
     */
    renderComponent(Component: SvelteComponent, props: Record<string, unknown>): string {
      if (mode === 'ssr') {
        return renderSvelteComponentToString(Component, props);
      }

      const propsString = Object.entries(props)
        .map(([key, value]) => `${key}={${JSON.stringify(value)}}`)
        .join(' ');

      return `<${Component.name ?? 'Component'}${propsString ? ` ${propsString}` : ''} />`;
    },
  };
}

/**
 * Helper to render Svelte component to string (SSR)
 */
function renderSvelteComponentToString(
  Component: SvelteComponent,
  _props: Record<string, unknown>
): string {
  // This is a simplified version - in production, you'd use Svelte's render function
  try {
    // For now, return a placeholder
    return `<div><!-- Svelte ${Component.name ?? 'Component'} rendered here --></div>`;
  } catch (error) {
    const logger = createContextualLogger({ module: 'svelte-renderer' });
    logger.error(
      'Svelte component render error',
      error instanceof Error ? error : new Error(String(error)),
      { component: Component.name }
    );
    return '<!-- Svelte component render error -->';
  }
}

/**
 * Helper to evaluate expressions
 */
function evaluateExpression(code: string, context: Record<string, unknown>): unknown {
  // Create a function with context variables
  const contextKeys = Object.keys(context);
  const contextValues = Object.values(context);

  try {
    const fn = new Function(...contextKeys, `return (${code})`);
    return fn(...contextValues);
  } catch (_error) {
    throw new Error(`Failed to evaluate expression: ${code}`);
  }
}

/**
 * Process frontmatter code
 */
function processFrontmatter(code: string): Record<string, unknown> {
  // This is simplified - in production, you'd properly parse and execute
  const context: Record<string, unknown> = {};

  try {
    // Extract simple variable declarations (with or without semicolon)
    const varMatches = code.matchAll(/const\s+(\w+)\s*=\s*(.+?)(?:;|$)/gm);
    for (const match of varMatches) {
      const [, name, value] = match;
      const trimmedValue = value.trim();
      try {
        context[name] = JSON.parse(trimmedValue);
      } catch {
        // Remove quotes if they exist
        context[name] = trimmedValue.replace(/^['"]|['"]$/g, '');
      }
    }
  } catch (error) {
    const logger = createContextualLogger({ module: 'svelte-frontmatter-processor' });
    logger.warn('Frontmatter processing error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return context;
}

/**
 * Generate hydration scripts
 */
function generateSvelteHydrationScripts(data: SvelteHydrationData): string[] {
  const scripts: string[] = [];

  // Main hydration script
  scripts.push(`
    window.__ASTRO_SVELTE_HYDRATION_DATA__ = ${JSON.stringify(data)};
    
    // Svelte hydration runtime will be loaded separately
    if (window.__ASTRO_SVELTE_HYDRATE__) {
      window.__ASTRO_SVELTE_HYDRATE__(window.__ASTRO_SVELTE_HYDRATION_DATA__);
    }
  `);

  return scripts;
}

/**
 * HTML escape helper
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Check if element is void (self-closing)
 */
function isVoidElement(tag: string): boolean {
  const voidElements = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ];
  return voidElements.includes(tag.toLowerCase());
}

/**
 * Create SSR renderer
 */
export function createSvelteSSRRenderer(options: Omit<SvelteRendererOptions, 'mode'> = {}) {
  return createSvelteRenderer({ ...options, mode: 'ssr' });
}

/**
 * Create client renderer
 */
export function createSvelteClientRenderer(options: Omit<SvelteRendererOptions, 'mode'> = {}) {
  return createSvelteRenderer({ ...options, mode: 'client' });
}
