/**
 * Runtime template helpers for CSP-compliant rendering
 * These helpers replace dynamic eval-based template rendering
 *
 * @module template-helpers
 */

import type { FragmentNode, Node } from '@minimal-astro/types/ast';

/**
 * Pre-compiled template function that renders HTML from a context
 * @callback TemplateFunction
 * @param {Record<string, any>} context - The rendering context
 * @returns {string} Rendered HTML string
 */
export type TemplateFunction = (context: Record<string, unknown>) => string;

/**
 * Astro template rendering context
 * @interface TemplateContext
 */
export interface TemplateContext {
  Astro: {
    props: Record<string, unknown>;
    request?: unknown;
    params?: Record<string, unknown>;
    url?: URL;
    slots?: Record<string, () => string | Promise<string>>;
  };
  [key: string]: unknown;
}

/**
 * Creates a safe property getter that handles null/undefined gracefully
 *
 * @param {unknown} obj - The object to get property from
 * @param {string} path - Dot-separated property path (e.g., 'user.profile.name')
 * @returns {unknown} The property value or undefined if not found
 *
 * @example
 * const obj = { user: { name: 'John' } };
 * createPropertyGetter(obj, 'user.name'); // 'John'
 * createPropertyGetter(obj, 'user.age'); // undefined
 * createPropertyGetter(null, 'any.path'); // undefined
 */
export function createPropertyGetter(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Creates a safe method caller that only allows whitelisted methods
 *
 * @param {unknown} obj - The object containing the method
 * @param {string} method - Method name to call
 * @param {unknown[]} args - Arguments to pass to the method
 * @returns {unknown} The method result or undefined
 * @throws {Error} If method is not in the safe methods whitelist
 *
 * @example
 * createMethodCaller('hello', 'toUpperCase', []); // 'HELLO'
 * createMethodCaller(['a', 'b'], 'join', ['-']); // 'a-b'
 */
export function createMethodCaller(obj: unknown, method: string, args: unknown[]): unknown {
  if (obj == null) return undefined;

  const func = (obj as Record<string, unknown>)[method];
  if (typeof func !== 'function') return undefined;

  // Only allow safe methods
  const safeMethods = ['toString', 'toLowerCase', 'toUpperCase', 'trim', 'join'];
  if (!safeMethods.includes(method)) {
    throw new Error(`Method ${method} is not allowed`);
  }

  return (func as (...args: unknown[]) => unknown).apply(obj, args);
}

/**
 * Creates a renderer function for simple expressions
 * Note: In production, expressions should be pre-compiled at build time
 *
 * @param {string} expression - The expression to render
 * @returns {Function} A function that evaluates the expression with given context
 *
 * @example
 * const render = createExpressionRenderer('userName');
 * render({ userName: 'John' }); // 'John'
 */
export function createExpressionRenderer(
  expression: string
): (context: Record<string, unknown>) => unknown {
  // This is a placeholder - in production, expressions should be pre-compiled
  // during build time to avoid runtime parsing
  return (context: Record<string, unknown>) => {
    // Simple property access
    if (/^\w+$/.test(expression)) {
      return context[expression];
    }

    // Property path (e.g., user.name)
    if (/^\w+(\.\w+)*$/.test(expression)) {
      return createPropertyGetter(context, expression);
    }

    // For complex expressions, return undefined
    // In production, these should be pre-compiled
    return undefined;
  };
}

/**
 * Creates a conditional renderer (if/else logic)
 *
 * @param {Function} condition - Function that returns boolean
 * @param {TemplateFunction} trueRenderer - Renderer for true condition
 * @param {TemplateFunction} [falseRenderer] - Optional renderer for false condition
 * @returns {TemplateFunction} Combined conditional renderer
 *
 * @example
 * const renderer = createConditionalRenderer(
 *   ctx => ctx.isLoggedIn,
 *   ctx => `Welcome ${ctx.userName}!`,
 *   ctx => 'Please log in'
 * );
 */
export function createConditionalRenderer(
  condition: (ctx: Record<string, unknown>) => boolean,
  trueRenderer: (ctx: Record<string, unknown>) => string,
  falseRenderer?: (ctx: Record<string, unknown>) => string
): TemplateFunction {
  return (context: Record<string, unknown>) => {
    if (condition(context)) {
      return trueRenderer(context);
    }
    return falseRenderer ? falseRenderer(context) : '';
  };
}

/**
 * Creates a loop renderer for arrays
 *
 * @param {Function} items - Function that returns array from context
 * @param {Function} itemRenderer - Function to render each item
 * @returns {TemplateFunction} Loop renderer function
 *
 * @example
 * const renderer = createLoopRenderer(
 *   ctx => ctx.items,
 *   (item, index) => `<li>${index}: ${item.name}</li>`
 * );
 */
export function createLoopRenderer(
  items: (ctx: Record<string, unknown>) => unknown[],
  itemRenderer: (item: unknown, index: number, ctx: Record<string, unknown>) => string
): TemplateFunction {
  return (context: Record<string, unknown>) => {
    const itemsArray = items(context) || [];
    return itemsArray.map((item, index) => itemRenderer(item, index, context)).join('');
  };
}

/**
 * Escapes HTML special characters to prevent XSS
 *
 * @param {unknown} value - Value to escape
 * @returns {string} HTML-safe string
 *
 * @example
 * escapeHtml('<script>alert("XSS")</script>');
 * // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 */
export function escapeHtml(value: unknown): string {
  if (value == null) return '';

  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Creates an HTML attribute renderer
 *
 * @param {string} name - Attribute name
 * @param {string|Function} value - Static value or function returning value
 * @returns {Function} Attribute renderer function
 *
 * @example
 * const renderer = createAttributeRenderer('class', ctx => ctx.className);
 * renderer({ className: 'active' }); // 'class="active"'
 *
 * const disabled = createAttributeRenderer('disabled', true);
 * disabled({}); // 'disabled'
 */
export function createAttributeRenderer(
  name: string,
  value: string | ((ctx: Record<string, unknown>) => unknown)
): (context: Record<string, unknown>) => string {
  return (context: Record<string, unknown>) => {
    const val = typeof value === 'function' ? value(context) : value;

    if (val === false || val == null) return '';
    if (val === true) return name;

    return `${name}="${escapeHtml(val)}"`;
  };
}

/**
 * Creates a component renderer placeholder
 * Note: Actual component rendering is handled by framework renderers
 *
 * @param {string} componentName - Name of the component
 * @param {Function} propsGetter - Function to get props from context
 * @param {TemplateFunction} [childrenRenderer] - Optional children renderer
 * @returns {TemplateFunction} Component renderer function
 */
export function createComponentRenderer(
  componentName: string,
  propsGetter: (ctx: Record<string, unknown>) => Record<string, unknown>,
  childrenRenderer?: TemplateFunction
): TemplateFunction {
  return (context: Record<string, unknown>) => {
    // This is a placeholder - actual component rendering
    // should be handled by the framework renderers
    const props = propsGetter(context);
    const children = childrenRenderer ? childrenRenderer(context) : '';

    return `<!-- Component: ${componentName} props=${JSON.stringify(props)} -->${children}<!-- /Component -->`;
  };
}

/**
 * Creates a slot renderer for Astro slots
 *
 * @param {string} [slotName='default'] - Name of the slot
 * @returns {TemplateFunction} Slot renderer function
 *
 * @example
 * const defaultSlot = createSlotRenderer();
 * const namedSlot = createSlotRenderer('header');
 */
export function createSlotRenderer(slotName = 'default'): TemplateFunction {
  return (context: Record<string, unknown>) => {
    const slots = context.Astro?.slots;
    if (!slots || typeof slots[slotName] !== 'function') {
      return '';
    }

    // Slots can be async
    const result = slots[slotName]();
    if (result instanceof Promise) {
      // In async context, this should be awaited
      // For now, return placeholder
      return `<!-- Async slot: ${slotName} -->`;
    }

    return result;
  };
}

/**
 * Combines multiple template functions into one
 *
 * @param {...TemplateFunction} templates - Template functions to combine
 * @returns {TemplateFunction} Combined template function
 *
 * @example
 * const header = createStaticTemplate('<header>Title</header>');
 * const content = ctx => `<main>${ctx.content}</main>`;
 * const combined = combineTemplates(header, content);
 */
export function combineTemplates(...templates: TemplateFunction[]): TemplateFunction {
  return (context: Record<string, unknown>) => {
    return templates.map((t) => t(context)).join('');
  };
}

/**
 * Creates a static template with no dynamic content
 *
 * @param {string} html - Static HTML string
 * @returns {TemplateFunction} Template function that always returns the same HTML
 *
 * @example
 * const footer = createStaticTemplate('<footer>© 2024</footer>');
 */
export function createStaticTemplate(html: string): TemplateFunction {
  return () => html;
}

/**
 * Pre-compiles an AST node to a template function
 * This should be done at build time in production for better performance
 *
 * @param {Node} node - AST node to compile
 * @returns {TemplateFunction} Compiled template function
 *
 * @todo Implement full AST compilation with attributes, expressions, etc.
 */
export function precompileNode(node: Node): TemplateFunction {
  switch (node.type) {
    case 'Text':
      return createStaticTemplate(node.value);

    case 'Element':
      // This is simplified - actual implementation would handle
      // attributes, children, etc.
      return createStaticTemplate(`<${node.tag}></${node.tag}>`);

    case 'Fragment': {
      const childTemplates = (node as FragmentNode).children.map(precompileNode);
      return combineTemplates(...childTemplates);
    }

    default:
      return createStaticTemplate('');
  }
}
