/**
 * React renderer for Astro components
 * Handles SSR and client-side rendering with hydration support
 */
import { createContextualLogger } from '@minimal-astro/internal-helpers';
/**
 * Creates a React renderer for Astro components
 */
export function createReactRenderer(options) {
  const { mode, hydrate = false, components = new Map(), props = {} } = options;
  // Create logger instance
  const logger = createContextualLogger({ renderer: 'react', mode });
  // Track hydration data
  const hydrationData = {
    props: {},
    directives: [],
    componentPaths: {},
  };
  // Component ID counter for hydration
  let componentIdCounter = 0;
  /**
   * Generate unique component ID
   */
  function generateComponentId() {
    return `astro-${++componentIdCounter}`;
  }
  /**
   * Extract client directive from attributes
   */
  function extractClientDirective(attrs) {
    const clientAttr = attrs.find((attr) => attr.name.startsWith('client:'));
    if (!clientAttr) return null;
    const directiveType = clientAttr.name.slice(7);
    const value = clientAttr.value;
    return {
      type: directiveType,
      value: value === true ? undefined : String(value),
      componentId: generateComponentId(),
      props: {},
    };
  }
  /**
   * Render AST node to React
   */
  function renderNode(node, context = {}) {
    switch (node.type) {
      case 'Fragment':
        return renderFragment(node, context);
      case 'Element':
        return renderElement(node, context);
      case 'Component':
        return renderComponent(node, context);
      case 'Text':
        return renderText(node, context);
      case 'Expression':
        return renderExpression(node, context);
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
  function renderFragment(node, context) {
    const children = node.children
      .map((child) => renderNode(child, context))
      .filter((child) => child !== null && child !== '');
    if (mode === 'ssr') {
      return children.join('').trim();
    }
    // For client mode, return React fragment
    if (children.length === 0) {
      return 'null';
    }
    if (children.length === 1) {
      return children[0];
    }
    return `React.Fragment({}, ${children.join(', ')})`;
  }
  /**
   * Render HTML element
   */
  function renderElement(node, context) {
    const { tag, attrs, children } = node;
    // Process attributes
    const attributes = {};
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
    // Client mode: Generate React element
    const propsString = JSON.stringify(attributes);
    return `React.createElement('${tag}', ${propsString}, ${renderedChildren.join(', ')})`;
  }
  /**
   * Render component node
   */
  function renderComponent(node, context) {
    const { tag, attrs, children } = node;
    // Check for client directive
    const directive = extractClientDirective(
      attrs.map((attr) => ({
        name: attr.name,
        value: attr.value !== null && attr.value !== undefined ? attr.value : true,
      }))
    );
    // Process props
    const componentProps = {};
    for (const attr of attrs) {
      if (!attr.name.startsWith('client:')) {
        let value = attr.value;
        // If value is an expression (wrapped in braces), evaluate it
        if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
          const expression = value.slice(1, -1); // Remove braces
          try {
            const result = evaluateExpression(expression, context);
            // Convert to string/boolean for HTML attributes
            if (typeof result === 'string' || typeof result === 'boolean') {
              value = result;
            } else {
              value = String(result);
            }
          } catch (error) {
            // For simple numbers, try parsing directly but keep as strings for attributes
            if (/^\d+$/.test(expression)) {
              value = expression; // Keep as string for HTML attributes
            } else if (/^\d+\.\d+$/.test(expression)) {
              value = expression; // Keep as string for HTML attributes
            } else {
              logger.warn('Failed to evaluate attribute expression', {
                expression,
                error: error instanceof Error ? error.message : String(error),
              });
              value = expression; // Fall back to the expression string
            }
          }
        }
        componentProps[attr.name] = value;
      }
    }
    // Add children as prop
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
          return `<div id="${wrapperId}" data-astro-root data-astro-component="${tag}"><!-- Component: ${tag} --></div>`;
        }
        // Component found, render with hydration marker
        const html = renderComponentToString(Component, componentProps);
        return `<div id="${wrapperId}" data-astro-root data-astro-component="${tag}">${html}</div>`;
      }
      if (!Component) {
        // Component not found, render simple placeholder
        return `<!-- Component: ${tag} -->`;
      }
      // Component found, render normally
      const html = renderComponentToString(Component, componentProps);
      return html;
    }
    // Client mode: Generate React element
    return `React.createElement(${tag}, ${JSON.stringify(componentProps)})`;
  }
  /**
   * Render text node
   */
  function renderText(node, _context) {
    const { value } = node;
    if (mode === 'ssr') {
      // Escape HTML entities in SSR mode for safety
      return escapeHtml(value);
    }
    return JSON.stringify(value);
  }
  /**
   * Render expression node
   */
  function renderExpression(node, context) {
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
    // Client mode: Return expression as-is
    return code;
  }
  /**
   * Main render function
   */
  return {
    render(ast) {
      // Process frontmatter first
      const frontmatter = ast.children.find((child) => child.type === 'Frontmatter');
      // Create render context
      const context = {
        ...props,
        ...(frontmatter ? processFrontmatter(frontmatter.code) : {}),
      };
      // Render the AST
      const output = renderNode(ast, context);
      // Generate hydration scripts if needed
      const scripts = hydrate ? generateHydrationScripts(hydrationData) : undefined;
      return {
        output,
        hydrationData: hydrate ? hydrationData : undefined,
        scripts,
      };
    },
    /**
     * Render a single component (useful for testing)
     */
    renderComponent(Component, props) {
      if (mode === 'ssr') {
        return renderComponentToString(Component, props);
      }
      return `React.createElement(${Component.name ?? 'Component'}, ${JSON.stringify(props)})`;
    },
  };
}
/**
 * Helper to render React component to string (SSR)
 */
function renderComponentToString(Component, _props) {
  // This is a simplified version - in production, you'd use ReactDOMServer
  try {
    // For now, return a placeholder
    return `<div><!-- ${Component.name ?? 'Component'} rendered here --></div>`;
  } catch (error) {
    const logger = createContextualLogger({ module: 'react-renderer' });
    logger.error(
      'Component render error',
      error instanceof Error ? error : new Error(String(error)),
      { component: Component.name }
    );
    return '<!-- Component render error -->';
  }
}
/**
 * Helper to evaluate expressions
 */
function evaluateExpression(code, context) {
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
function processFrontmatter(code) {
  // This is simplified - in production, you'd properly parse and execute
  const context = {};
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
    const logger = createContextualLogger({ module: 'frontmatter-processor' });
    logger.warn('Frontmatter processing error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return context;
}
/**
 * Generate hydration scripts
 */
function generateHydrationScripts(data) {
  const scripts = [];
  // Main hydration script
  scripts.push(`
    window.__ASTRO_HYDRATION_DATA__ = ${JSON.stringify(data)};
    
    // Hydration runtime will be loaded separately
    if (window.__ASTRO_HYDRATE__) {
      window.__ASTRO_HYDRATE__(window.__ASTRO_HYDRATION_DATA__);
    }
  `);
  return scripts;
}
/**
 * HTML escape helper
 */
function escapeHtml(str) {
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
function isVoidElement(tag) {
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
export function createSSRRenderer(options = {}) {
  return createReactRenderer({ ...options, mode: 'ssr' });
}
/**
 * Create client renderer
 */
export function createClientRenderer(options = {}) {
  return createReactRenderer({ ...options, mode: 'client' });
}
//# sourceMappingURL=renderer.js.map
