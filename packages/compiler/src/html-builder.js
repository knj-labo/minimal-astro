const DEFAULT_OPTIONS = {
  prettyPrint: false,
  indent: '  ',
  streaming: false,
  chunkSize: 16384, // 16KB chunks
  evaluateExpressions: false,
  escapeHtml: true,
};
// HTML void elements that should not have closing tags
const VOID_ELEMENTS = new Set([
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
]);
// HTML escape optimization with lookup table and fast-path
const HTML_ESCAPE_LOOKUP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const HTML_ESCAPE_REGEX = /[&<>"]'/g;
const ATTR_ESCAPE_REGEX = /[&"]'/g;
/**
 * Optimized HTML escape function with single-pass lookup
 */
function escapeHtml(text) {
  // Fast path: no special characters
  if (!HTML_ESCAPE_REGEX.test(text)) {
    return text;
  }
  // Reset regex state
  HTML_ESCAPE_REGEX.lastIndex = 0;
  return text.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_LOOKUP[char]);
}
/**
 * Manual loop optimization for hot paths (exported for potential use)
 */
export function escapeHtmlFast(text) {
  let result = '';
  let lastIndex = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const escaped = HTML_ESCAPE_LOOKUP[char];
    if (escaped) {
      result += text.slice(lastIndex, i) + escaped;
      lastIndex = i + 1;
    }
  }
  return lastIndex === 0 ? text : result + text.slice(lastIndex);
}
/**
 * Optimized attribute escaping with fast-path
 */
function escapeAttribute(value) {
  // Fast path: no special characters
  if (!ATTR_ESCAPE_REGEX.test(value)) {
    return value;
  }
  // Reset regex state
  ATTR_ESCAPE_REGEX.lastIndex = 0;
  return value.replace(ATTR_ESCAPE_REGEX, (char) => HTML_ESCAPE_LOOKUP[char]);
}
/**
 * Legacy escape function for backward compatibility (exported for testing)
 */
export function escapeHtmlLegacy(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
/**
 * Formats an attribute for HTML output
 */
function formatAttribute(attr, context) {
  if (attr.value === true) {
    return attr.name;
  }
  if (attr.value === false) {
    return '';
  }
  let value = String(attr.value);
  // If the attribute value looks like an expression and we have context, evaluate it
  if (
    context &&
    typeof attr.value === 'string' &&
    attr.value.startsWith('{') &&
    attr.value.endsWith('}')
  ) {
    const expressionCode = attr.value.slice(1, -1);
    value = evaluateExpression(expressionCode, context);
  }
  return `${attr.name}="${escapeAttribute(value)}"`;
}
/**
 * Formats attributes array for HTML output
 */
function formatAttributes(attrs, context) {
  const formatted = attrs
    .map((attr) => formatAttribute(attr, context))
    .filter(Boolean)
    .join(' ');
  return formatted ? ` ${formatted}` : '';
}
/**
 * Safely evaluate a JavaScript expression with given context
 *
 * SECURITY NOTE: This uses Function constructor which can be dangerous.
 * In a production system, consider using a safer alternative like:
 * - A dedicated expression parser (e.g., jsep + safe-eval)
 * - A restricted syntax subset
 * - Sandboxed execution environment
 *
 * Current implementation is suitable for build-time evaluation of trusted content only.
 */
function evaluateExpression(code, context) {
  try {
    // Create a function that only has access to the context variables
    // Note: 'with' statement is used here for variable scope isolation
    // This is generally discouraged but acceptable for build-time evaluation
    const func = new Function(
      'context',
      `
      with(context.variables) {
        try {
          return ${code};
        } catch (e) {
          return undefined;
        }
      }
    `
    );
    const result = func(context);
    // Convert result to string, handling undefined/null gracefully
    if (result === undefined || result === null) {
      return '';
    }
    return String(result);
  } catch (_error) {
    // If evaluation fails, return empty string
    return '';
  }
}
/**
 * Extract frontmatter variables from AST
 */
function extractFrontmatterVariables(ast) {
  const variables = {};
  for (const child of ast.children) {
    if (child.type === 'Frontmatter') {
      try {
        // Strip TypeScript syntax first
        const strippedCode = child.code
          .replace(/(?<!['"`:]):\s*[A-Z][A-Za-z0-9_<>[\\]{}|&\s]*(?=\s*[=,;)\\]}])/g, '') // Remove type annotations (only if starts with capital letter)
          .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '') // Remove interfaces
          .replace(/type\s+\w+\s*=\s*[^;]+;/g, ''); // Remove type declarations
        // Create a safer evaluation context
        const func = new Function(`
          ${strippedCode}
          
          // Extract all declared variables
          const context = {};
          ${
            strippedCode
              .match(/(?:const|let|var)\s+(\w+)/g)
              ?.map((match) => {
                const varName = match.replace(/(?:const|let|var)\s+/, '');
                return `try { context.${varName} = ${varName}; } catch (e) { context.${varName} = undefined; }`;
              })
              .join('\n') || ''
          }
          
          return context;
        `);
        const result = func();
        Object.assign(variables, result);
      } catch (error) {
        // If frontmatter evaluation fails, continue with empty variables
        console.warn('Failed to evaluate frontmatter:', error);
      }
      break; // Only process the first frontmatter block
    }
  }
  return variables;
}
/**
 * Builds HTML from a single AST node
 */
function buildNodeHtml(node, options, depth = 0, context) {
  switch (node.type) {
    case 'Fragment':
      return buildFragmentHtml(node, options, depth, context);
    case 'Frontmatter':
      return buildFrontmatterHtml(node, options, depth, context);
    case 'Element':
      return buildElementHtml(node, options, depth, context);
    case 'Component':
      return buildComponentHtml(node, options, depth, context);
    case 'Text':
      return buildTextHtml(node, options, depth, context);
    case 'Expression':
      return buildExpressionHtml(node, options, depth, context);
    case 'RawHTML':
      // Handle raw HTML from component rendering
      return node.value || '';
    default:
      // Unknown node type, skip it
      return '';
  }
}
/**
 * Builds HTML from a Fragment node
 */
function buildFragmentHtml(node, options, depth, context) {
  return node.children
    .map((child) => buildNodeHtml(child, options, depth, context))
    .filter((html) => html !== '') // Filter out empty strings from frontmatter
    .join('');
}
/**
 * Builds HTML from a Frontmatter node (renders as empty string for HTML output)
 */
function buildFrontmatterHtml(_node, _options, _depth, _context) {
  // Frontmatter is not rendered in HTML output
  return '';
}
/**
 * Builds HTML from an Element node
 */
function buildElementHtml(node, options, depth, context) {
  const indent = options.prettyPrint ? (options.indent ?? '').repeat(depth) : '';
  const newline = options.prettyPrint ? '\n' : '';
  const tag = node.tag.toLowerCase();
  const attrs = formatAttributes(node.attrs, context);
  // Handle void elements (always render without closing tag, even if marked as self-closing)
  if (VOID_ELEMENTS.has(tag)) {
    return `${indent}<${tag}${attrs}>${newline}`;
  }
  // Handle self-closing elements (only for non-void elements)
  if (node.selfClosing) {
    return `${indent}<${tag}${attrs} />${newline}`;
  }
  // Handle normal elements with children
  const openTag = `${indent}<${tag}${attrs}>`;
  if (node.children.length === 0) {
    return `${openTag}</${tag}>${newline}`;
  }
  // Check if children are only text nodes (inline content)
  const hasOnlyTextChildren = node.children.every(
    (child) => child.type === 'Text' || child.type === 'Expression'
  );
  if (hasOnlyTextChildren && options.prettyPrint) {
    // Render inline content on same line
    const childrenHtml = node.children
      .map((child) => buildNodeHtml(child, { ...options, prettyPrint: false }, 0, context))
      .join('');
    return `${openTag}${childrenHtml}</${tag}>${newline}`;
  }
  // Render with proper indentation
  const childrenHtml = node.children
    .map((child) => buildNodeHtml(child, options, depth + 1, context))
    .join('');
  const closeTag = `${indent}</${tag}>`;
  if (options.prettyPrint) {
    return `${openTag}${newline}${childrenHtml}${closeTag}${newline}`;
  }
  return `${openTag}${childrenHtml}${closeTag}`;
}
/**
 * Builds HTML from a Component node (renders as empty string for now)
 */
function buildComponentHtml(node, options, depth, _context) {
  // Components will be handled by renderers in later phases
  // For now, render as empty string or comment
  if (options.prettyPrint) {
    const indent = (options.indent ?? '').repeat(depth);
    return `${indent}<!-- Component: ${node.tag} -->\n`;
  }
  return `<!-- Component: ${node.tag} -->`;
}
/**
 * Builds HTML from a Text node
 */
function buildTextHtml(node, options, depth, _context) {
  const indent = options.prettyPrint ? (options.indent ?? '').repeat(depth) : '';
  // Don't escape DOCTYPE declarations or if escaping is disabled
  // Also check for the special case where '<' and '!DOCTYPE' are split
  const text =
    node.value.trim().startsWith('<!DOCTYPE') ||
    node.value.trim().startsWith('!DOCTYPE') ||
    node.value === '<' ||
    options.escapeHtml === false
      ? node.value
      : escapeHtml(node.value);
  // Skip indentation for text nodes that are part of inline content
  if (text.trim() === '') {
    return options.prettyPrint ? '' : text;
  }
  return options.prettyPrint ? `${indent}${text}\n` : text;
}
/**
 * Builds HTML from an Expression node
 */
function buildExpressionHtml(node, options, depth, context) {
  // If expression evaluation is enabled and we have context, evaluate the expression
  if (options.evaluateExpressions && context) {
    const result = evaluateExpression(node.code, context);
    return escapeHtml(result);
  }
  // Otherwise, render as comment (existing behavior)
  if (options.prettyPrint) {
    const indent = (options.indent ?? '').repeat(depth);
    return `${indent}<!-- Expression: ${node.code} -->\n`;
  }
  return `<!-- Expression: ${node.code} -->`;
}
/**
 * Builds HTML string from an AST
 */
export function buildHtml(ast, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  // Extract evaluation context if expression evaluation is enabled
  let context;
  // const _debugInfo = '';
  if (opts.evaluateExpressions) {
    const variables = extractFrontmatterVariables(ast);
    context = { variables };
  }
  let html = buildNodeHtml(ast, opts, 0, context);
  // Clean up extra newlines if pretty printing is enabled
  if (opts.prettyPrint) {
    html = `${html.replace(/\n\s*\n/g, '\n').trim()}\n`;
  }
  return html;
}
/**
 * Streaming HTML builder for memory-efficient processing
 */
export function createStreamingHtmlBuilder(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunkSize = opts.chunkSize ?? 16384;
  return {
    /**
     * Build HTML to a stream with chunked processing
     */
    buildToStream: async (ast, streamOptions) => {
      const { write } = streamOptions;
      let buffer = '';
      const writeBuffered = async (content) => {
        buffer += content;
        if (buffer.length >= chunkSize) {
          await write(buffer);
          buffer = '';
        }
      };
      const flush = async () => {
        if (buffer.length > 0) {
          await write(buffer);
          buffer = '';
        }
      };
      const buildNodeToStream = async (node, depth) => {
        switch (node.type) {
          case 'Fragment':
            await buildFragmentToStream(node, depth);
            break;
          case 'Element':
            await buildElementToStream(node, depth);
            break;
          case 'Component':
            await buildComponentToStream(node, depth);
            break;
          case 'Text':
            await buildTextToStream(node, depth);
            break;
          case 'Expression':
            await buildExpressionToStream(node, depth);
            break;
          case 'Frontmatter':
            // Frontmatter doesn't output HTML
            break;
          default:
            // Unknown node type, skip it
            break;
        }
      };
      const buildFragmentToStream = async (node, depth) => {
        for (const child of node.children) {
          await buildNodeToStream(child, depth);
        }
      };
      const buildElementToStream = async (node, depth) => {
        const indent = opts.prettyPrint ? (opts.indent?.repeat(depth) ?? '') : '';
        const newline = opts.prettyPrint ? '\n' : '';
        await writeBuffered(`${indent}<${node.tag}${formatAttributes(node.attrs)}>`);
        if (VOID_ELEMENTS.has(node.tag)) {
          await writeBuffered(newline);
          return;
        }
        // Handle inline vs block content
        const hasBlockChildren = node.children.some(
          (child) => child.type === 'Element' || child.type === 'Component'
        );
        if (hasBlockChildren && opts.prettyPrint) {
          await writeBuffered(newline);
        }
        for (const child of node.children) {
          await buildNodeToStream(child, depth + 1);
        }
        if (hasBlockChildren && opts.prettyPrint) {
          await writeBuffered(indent);
        }
        await writeBuffered(`</${node.tag}>${newline}`);
      };
      const buildComponentToStream = async (node, depth) => {
        const indent = opts.prettyPrint ? (opts.indent?.repeat(depth) ?? '') : '';
        const newline = opts.prettyPrint ? '\n' : '';
        await writeBuffered(
          `${indent}<!-- Component: ${node.tag}${formatAttributes(node.attrs)} -->${newline}`
        );
        for (const child of node.children) {
          await buildNodeToStream(child, depth + 1);
        }
        await writeBuffered(`${indent}<!-- /Component: ${node.tag} -->${newline}`);
      };
      const buildTextToStream = async (node, depth) => {
        const indent = opts.prettyPrint ? (opts.indent?.repeat(depth) ?? '') : '';
        // Don't escape DOCTYPE declarations or if escaping is disabled
        // Also check for the special case where '<' and '!DOCTYPE' are split
        const text =
          node.value.trim().startsWith('<!DOCTYPE') ||
          node.value.trim().startsWith('!DOCTYPE') ||
          node.value === '<' ||
          opts.escapeHtml === false
            ? node.value
            : escapeHtml(node.value);
        // Handle inline vs block text
        if (opts.prettyPrint && text.trim() !== text) {
          await writeBuffered(`${indent}${text.trim()}\n`);
        } else {
          await writeBuffered(text);
        }
      };
      const buildExpressionToStream = async (node, depth) => {
        const indent = opts.prettyPrint ? (opts.indent?.repeat(depth) ?? '') : '';
        const newline = opts.prettyPrint ? '\n' : '';
        await writeBuffered(`${indent}<!-- Expression: ${escapeHtml(node.code)} -->${newline}`);
      };
      await buildNodeToStream(ast, 0);
      await flush();
    },
  };
}
/**
 * Convenience function to build HTML to stream
 */
export async function buildHtmlToStream(ast, streamOptions, builderOptions = {}) {
  const builder = createStreamingHtmlBuilder(builderOptions);
  await builder.buildToStream(ast, streamOptions);
}
//# sourceMappingURL=html-builder.js.map
