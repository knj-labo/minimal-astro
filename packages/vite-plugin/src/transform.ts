import { astToJSX, evaluateExpression, safeExecute } from '@minimal-astro/internal-helpers';
import type {
  Attr,
  ComponentNode,
  ElementNode,
  ExpressionNode,
  FragmentNode,
  FrontmatterNode,
  Node,
  TextNode,
} from '@minimal-astro/types/ast';
import { generateRenderFunction } from './code-generation-helpers.js';
// type HydrationData available if needed
import { injectHmrCode } from './hmr.js';
import { createSourceMapTransformer } from './source-map-utils.js';
import { extractImports, stripTypeScript } from './typescript-stripper.js';

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
  map?: string | Record<string, unknown>; // Source map can be string or object
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
  let getStaticPathsCode = '';

  if (frontmatter) {
    const code = frontmatter.code;
    const getStaticPathsRegex =
      /export\s+async\s+function\s+getStaticPaths\s*\([^)]*\)\s*\{[\s\S]*?^\}/m;
    const match = code.match(getStaticPathsRegex);

    if (match) {
      getStaticPathsCode = match[0];
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

  const templateAst: FragmentNode = {
    type: 'Fragment',
    children: templateNodes,
    loc: ast.loc,
  };

  // Prepare frontmatter code
  let processedFrontmatterCode = '';
  if (frontmatterCode) {
    // Strip TypeScript syntax from frontmatter code using SWC
    const strippedCode = stripTypeScript(frontmatterCode, {
      jsx: framework === 'react' || framework === 'preact',
      filename: options.filename,
    });
    // Indent the code for the render function
    processedFrontmatterCode = strippedCode
      .split('\n')
      .map((line) => (line ? `  ${line}` : ''))
      .join('\n');
  }

  // Check if we need client components
  const hasClientComponents = Object.keys(componentTypes).some((name) => {
    return componentTypes[name] !== 'astro';
  });

  // Generate the render function using helper
  const renderFunctionBody = generateRenderFunction({
    frontmatterCode: processedFrontmatterCode,
    templateAst,
    prettyPrint,
    hasClientComponents,
    componentTypes,
    componentPaths,
  });

  // Create the render function
  parts.push('');
  parts.push('// Component render function');
  parts.push('export async function render(props = {}) {');
  parts.push(renderFunctionBody);
  parts.push('}');

  // Add getStaticPaths export if it exists
  if (getStaticPathsCode) {
    parts.push('');
    parts.push('// Export getStaticPaths');
    parts.push(getStaticPathsCode);
  }

  // Add JSX component export if using React/Preact
  if (framework !== 'vanilla') {
    parts.push('');
    parts.push('// JSX Component export');
    parts.push('export function Component(props = {}) {');

    const jsxCode = astToJSX(templateAst, {
      runtime: framework,
      jsxImportSource: framework,
    });

    parts.push(`  ${jsxCode.split('\n').join('\n  ')}`);
    parts.push('}');
  }

  // Add metadata
  parts.push('');
  parts.push('// Component metadata');
  parts.push('export const metadata = {');
  parts.push(`  filename: ${JSON.stringify(filename)},`);
  parts.push(`  dev: ${dev},`);
  parts.push(`  hasClientDirectives: ${hasClientDirectives(ast)},`);
  parts.push(`  framework: ${JSON.stringify(framework)},`);
  parts.push('};');

  // Default export for easier imports
  parts.push('');
  parts.push(
    `export default { render, metadata${framework !== 'vanilla' ? ', Component' : ''}${getStaticPathsCode ? ', getStaticPaths' : ''} };`
  );

  const jsCode = parts.join('\n');

  // Inject HMR code in development mode
  const codeWithHmr = injectHmrCode(jsCode, filename, dev);

  // Generate source map if requested
  if (options.sourceMap) {
    const transformer = createSourceMapTransformer(codeWithHmr, filename);
    const result = transformer.getResult();
    return {
      code: result.code,
      map: result.map,
    };
  }

  return {
    code: codeWithHmr,
    map: undefined,
  };
}

/**
 * Check if the component has client directives
 */
export function hasClientDirectives(ast: FragmentNode): boolean {
  return checkNodeForClientDirectives(ast);
}

function checkNodeForClientDirectives(node: Node): boolean {
  switch (node.type) {
    case 'Fragment':
      return (node as FragmentNode).children.some(checkNodeForClientDirectives);

    case 'Element':
    case 'Component': {
      const element = node as ElementNode | ComponentNode;
      return (
        element.attrs.some((attr) => attr.name.startsWith('client:')) ||
        element.children.some(checkNodeForClientDirectives)
      );
    }

    default:
      return false;
  }
}
