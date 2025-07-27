import { astToJSX, evaluateExpression, safeExecute } from '@minimal-astro/internal-helpers';
import type {
  ComponentNode,
  ElementNode,
  FragmentNode,
  FrontmatterNode,
  Node,
} from '@minimal-astro/types/ast';
// type HydrationData available if needed
import { injectHmrCode } from './hmr.js';
import { createSourceMapTransformer } from './source-map-utils.js';
import { extractImportsWithSwc, stripTypeScriptWithSwc } from './typescript-stripper.js';


export interface TransformOptions {
  filename: string;
  dev?: boolean;
  prettyPrint?: boolean;
  ssr?: boolean;
  framework?: 'react' | 'preact' | 'vanilla';
  components?: Map<string, unknown>;
  sourceMap?: boolean;
  renderers?: Record<string, unknown>;
}

export interface TransformResult {
  code: string;
  map?: any; // Source map can be string or object
}


/**
 * Transform an Astro AST to a JavaScript module
 */
export function transformAstroToJs(ast: FragmentNode, options: TransformOptions): TransformResult {
  // Added comment to force recompile
  return safeExecute(
    () => transformAstroToJsInternal(ast, options),
    {
      operation: 'transform',
      filename: options.filename,
      context: { framework: options.framework, dev: options.dev },
    },
    {
      fallbackValue: {
        code: `// Transform error occurred
export default {};`,
        map: undefined,
      },
    }
  );
}

function transformAstroToJsInternal(ast: FragmentNode, options: TransformOptions): TransformResult {
  const {
    filename,
    dev = false,
    prettyPrint = true,
    ssr: _ssr = true,
    framework = 'vanilla',
    components: _components = new Map(),
  } = options;

  // Extract frontmatter
  const frontmatter = ast.children.find((child: Node) => child.type === 'Frontmatter') as
    | FrontmatterNode
    | undefined;

  const templateNodes = ast.children.filter((child) => child.type !== 'Frontmatter');

  // Generate the module
  const parts: string[] = [];

  const frontmatterImports: string[] = [];
  const componentImports: Map<string, string> = new Map(); // component name -> import path
  let frontmatterCode = '';
  let _getStaticPathsCode = '';

  if (frontmatter) {
    const code = frontmatter.code;
    const getStaticPathsRegex =
      /export\s+async\s+function\s+getStaticPaths\s*\([^)]*\)\s*\{[\s\S]*?^\}/m;
    const match = code.match(getStaticPathsRegex);

    if (match) {
      _getStaticPathsCode = match[0];
      const remainingCode = code.replace(getStaticPathsRegex, '');
      const lines = remainingCode.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('import')) {
          frontmatterImports.push(line);
          // Extract component imports
          const componentMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
          if (
            componentMatch &&
            (componentMatch[2].endsWith('.astro') ||
              componentMatch[2].endsWith('.jsx') ||
              componentMatch[2].endsWith('.vue') ||
              componentMatch[2].endsWith('.svelte'))
          ) {
            componentImports.set(componentMatch[1], componentMatch[2]);
          }
        } else {
          frontmatterCode += `${line}\n`;
        }
      }
    } else {
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('import')) {
          frontmatterImports.push(line);
          // Extract component imports
          const componentMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
          if (
            componentMatch &&
            (componentMatch[2].endsWith('.astro') ||
              componentMatch[2].endsWith('.jsx') ||
              componentMatch[2].endsWith('.vue') ||
              componentMatch[2].endsWith('.svelte'))
          ) {
            componentImports.set(componentMatch[1], componentMatch[2]);
          }
        } else {
          frontmatterCode += `${line}\n`;
        }
      }
    }
  }

  // Add imports that are commonly needed
  parts.push(`// Auto-generated from ${filename}`);

  // Import buildHtml at the top
  parts.push(`import { buildHtml } from '@minimal-astro/compiler';`);

  // Add frontmatter imports
  if (frontmatterImports.length > 0) {
    parts.push('');
    parts.push('// Frontmatter imports');
    parts.push(...frontmatterImports);
  }

  // Create component registry at module level
  parts.push('');
  parts.push('// Component registry at module level');
  parts.push('const components = {};');
  parts.push('const componentTypes = {};');

  // Register imported components at module level
  for (const [name, path] of componentImports) {
    parts.push(`components['${name}'] = ${name};`);
    // Detect component type from path
    if (path.endsWith('.jsx') || path.endsWith('.tsx')) {
      parts.push(`componentTypes['${name}'] = 'react';`);
    } else if (path.endsWith('.vue')) {
      parts.push(`componentTypes['${name}'] = 'vue';`);
    } else if (path.endsWith('.svelte')) {
      parts.push(`componentTypes['${name}'] = 'svelte';`);
    } else {
      parts.push(`componentTypes['${name}'] = 'astro';`);
    }
  }

  // Track component paths for client-side hydration
  parts.push('const componentPaths = {};');
  for (const imp of frontmatterImports) {
    const match = imp.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (match) {
      const [, name, path] = match;
      // Convert relative paths for Vite client-side imports
      if (path.startsWith('.')) {
        // Find the project root (where blog example is)
        const projectRoot = `${filename.split('/examples/blog/')[0]}/examples/blog`;
        const fileDir = filename
          .substring(projectRoot.length)
          .substring(0, filename.substring(projectRoot.length).lastIndexOf('/'));

        // Resolve the relative path
        let resolved = path;
        if (path.startsWith('../')) {
          // Go up one directory from /src/pages to /src
          resolved = `/src/${path.substring(3)}`;
        } else if (path.startsWith('./')) {
          resolved = `${fileDir}/${path.substring(2)}`;
        }

        parts.push(`componentPaths['${name}'] = '${resolved}';`);
      } else {
        parts.push(`componentPaths['${name}'] = '${path}';`);
      }
    }
  }

  // Create the render function
  parts.push('');
  parts.push('// Component render function');
  parts.push('export async function render(props = {}) {');
  parts.push('  // Extract Astro from props or create default');
  parts.push('  const Astro = props.Astro || {');
  parts.push('    props: props,');
  parts.push('    request: {},');
  parts.push('    params: {},');
  parts.push('    url: new URL("http://localhost:3000/"),');
  parts.push('    slots: {}');
  parts.push('  };
  parts.push('  // Ensure props are accessible via Astro.props');
  parts.push('  if (!Astro.props) Astro.props = props;');

  // Add frontmatter code inside render function so it has access to Astro
  if (frontmatterCode) {
    parts.push('');
    parts.push('  // Frontmatter execution');
    // Strip TypeScript syntax from frontmatter code using SWC
    const strippedCode = stripTypeScriptWithSwc(frontmatterCode, {
      jsx: framework === 'react' || framework === 'preact',
      filename: options.filename,
    });
    // Indent the code for the render function
    const indentedCode = strippedCode
      .split('\n')
      .map((line) => (line ? `  ${line}` : ''))
      .join('\n');
    parts.push(indentedCode);
  }

  const _templateAst: FragmentNode = {
    type: 'Fragment',
    children: templateNodes,
    loc: ast.loc,
  };

  if (framework !== 'vanilla' && hasClientDirectives(ast)) {
    // Use React renderer for components with client directives
    parts.push('  // SSR with hydration support');
    parts.push(
      '  const renderResult = await renderUniversalComponent(Component, props, componentType, {'
    );
    parts.push('    // Pass renderers to the universal component renderer');
    parts.push('    renderers: options.renderers,');
    parts.push('    hydrate: true,');
    parts.push('    components,');
    parts.push('    props: {},');
    parts.push('  }');
    parts.push('  const { html, hydrationData, scripts } = renderResult;');
    parts.push('');
    parts.push('  // Combine HTML with hydration scripts');
    parts.push(
      '  const finalHtml = html + (scripts ? scripts.map(s => `<script>${s}</script>`).join("") : "");'
    );
    parts.push('  return { html: finalHtml, hydrationData };');
  } else {
    // Generate dynamic HTML at runtime
    parts.push('  // Build HTML dynamically with Astro context');
    parts.push('  try {');

    // Components are already registered at module level

    parts.push('    ');
    parts.push('    // Process AST to replace expressions and render components');
    parts.push('    async function processAstNode(node, context) {');
    parts.push(`      if (node.type === 'Expression') {`);
    parts.push('        try {');
    parts.push('          const value = evaluateExpression(node.code, context);');
    parts.push(`          return { type: 'Text', value: String(value) };`);
    parts.push('        } catch (e) {');
    parts.push(`          return { type: 'Text', value: '' };`);
    parts.push('        }');
    parts.push('      }');
    parts.push('      ');
    parts.push('      // Handle Component nodes');
    parts.push(`      if (node.type === 'Component') {`);
    parts.push('        const Component = components[node.tag];');
    parts.push(`        const componentType = componentTypes[node.tag] || 'astro';`);
    parts.push('        ');
    parts.push('        if (Component) {');
    parts.push('          // Process component attributes');
    parts.push('          const props = {};');
    parts.push('          let hasClientDirective = false;');
    parts.push('          ');
    parts.push('          if (node.attrs) {');
    parts.push('            for (const attr of node.attrs) {');
    parts.push('              let value = attr.value;');
    parts.push('              // Check for client directives');
    parts.push(`              if (attr.name.startsWith('client:')) {`);
    parts.push('                hasClientDirective = true;');
    parts.push('                props[attr.name] = value || true;');
    parts.push('                continue;');
    parts.push('              }');
    parts.push('              // Evaluate expression attributes');
    parts.push(
      `              if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {`
    );
    parts.push('                try {');
    parts.push('                  const exprCode = value.slice(1, -1);
    parts.push('                  value = evaluateExpression(exprCode, context);');
    parts.push('                } catch (e) {');
    parts.push('                  // Keep original value on error');
    parts.push('                }');
    parts.push('              }');
    parts.push('              props[attr.name] = value;');
    parts.push('            }');
    parts.push('          }');
    parts.push('          ');
    parts.push('          // Handle different component types');
    parts.push(
      `          if (componentType === 'astro' && typeof Component.render === 'function') {`
    );
    parts.push('            // Astro component - handle slots');
    parts.push('            const slotFunction = async () => {');
    parts.push(`              if (!node.children || node.children.length === 0) return '';`);
    parts.push('              ');
    parts.push('              const childContext = { ...context };');
    parts.push('              const processedChildren = [];');
    parts.push('              ');
    parts.push('              for (const child of node.children) {');
    parts.push('                const processed = await processAstNode(child, childContext);');
    parts.push(
      `                if (processed.type === 'Text' && !processed.value.trim()) continue;`
    );
    parts.push('                processedChildren.push(processed);');
    parts.push('              }');
    parts.push('              ');
    parts.push(
      `              const html = buildHtml({ type: 'Fragment', children: processedChildren }, {`
    );
    parts.push('                prettyPrint: false,');
    parts.push('                evaluateExpressions: false,');
    parts.push('                escapeHtml: false');
    parts.push('              });');
    parts.push('              return html;');
    parts.push('            };');
    parts.push('            ');
    parts.push('            const componentAstro = {');
    parts.push('              ...context.Astro,');
    parts.push('              props: props,');
    parts.push('              slots: { default: slotFunction }
    parts.push('            };');
    parts.push('            ');
    parts.push(
      '            const result = await Component.render({ ...props, Astro: componentAstro });'
    );
    parts.push(`            return { type: 'RawHTML', value: result.html || '' };`);
    parts.push('          } else {');
    parts.push(
      '            // Framework component (React/Vue/Svelte) - for now, just render placeholder'
    );
    parts.push('            // TODO: Implement proper SSR for framework components');
    parts.push(
      '            const componentId = `${node.tag}-${Math.random().toString(36).slice(2, 9)}`;'
    );
    parts.push('            ');
    parts.push('            if (hasClientDirective) {');
    parts.push('              // If it has a client directive, wrap in astro-island for hydration');
    parts.push(
      `              const directive = node.attrs.find(attr => attr.name.startsWith('client:'))?.name.replace('client:', '');`
    );
    parts.push(`              const propsJson = JSON.stringify(props).replace(/"/g, '&quot;');`);
    parts.push('              ');
    parts.push('              return { ');
    parts.push(