import { buildHtml } from '../core/html-builder.js';
import { astToJSX } from '../core/renderer/jsx-transform.js';
import { createSSRRenderer } from '../core/renderer/react.js';
import { safeExecute } from '../core/utils/error-boundary.js';
import type {
  ComponentNode,
  ElementNode,
  FragmentNode,
  FrontmatterNode,
  Node,
} from '../types/ast.js';
// type HydrationData available if needed
import { injectHmrCode } from './hmr.js';

export interface TransformOptions {
  filename: string;
  dev?: boolean;
  prettyPrint?: boolean;
  ssr?: boolean;
  framework?: 'react' | 'preact' | 'vanilla';
  components?: Map<string, unknown>;
  sourceMap?: boolean;
}

export interface TransformResult {
  code: string;
  map?: string;
}

/**
 * Strip TypeScript syntax from code
 * This is a simple implementation that handles common cases
 */
function stripTypeScript(code: string): string {
  // Remove type annotations (e.g., : string, : number)
  let stripped = code.replace(/:\s*[A-Za-z0-9_<>[\]{}|&\s]+(?=\s*[=,;)\]}])/g, '');

  // Remove interface declarations
  stripped = stripped.replace(/export\s+interface\s+\w+\s*\{[^}]*\}/gs, '');
  stripped = stripped.replace(/interface\s+\w+\s*\{[^}]*\}/gs, '');

  // Remove type declarations
  stripped = stripped.replace(/export\s+type\s+\w+\s*=\s*[^;]+;/g, '');
  stripped = stripped.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');

  // Remove readonly modifiers
  stripped = stripped.replace(/\breadonly\s+/g, '');

  // Remove type assertions (as Type)
  stripped = stripped.replace(/\s+as\s+[A-Za-z0-9_<>[\]{}|&\s]+/g, '');

  // Remove type parameters <T>
  stripped = stripped.replace(/<[A-Za-z0-9_,\s]+>/g, '');

  return stripped;
}

/**
 * Transform an Astro AST to a JavaScript module
 */
export function transformAstroToJs(ast: FragmentNode, options: TransformOptions): TransformResult {
  return safeExecute(
    () => transformAstroToJsInternal(ast, options),
    {
      operation: 'transform',
      filename: options.filename,
      context: { framework: options.framework, dev: options.dev },
    },
    {
      fallbackValue: {
        code: '// Transform error occurred\nexport default {};',
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
    components = new Map(),
  } = options;

  // Extract frontmatter
  const frontmatter = ast.children.find((child) => child.type === 'Frontmatter') as
    | FrontmatterNode
    | undefined;
  const templateNodes = ast.children.filter((child) => child.type !== 'Frontmatter');

  // Generate the module
  const parts: string[] = [];

  // Add imports that are commonly needed
  parts.push(`// Auto-generated from ${filename}`);

  // Import React/Preact if needed
  if (framework === 'react' && hasClientDirectives(ast)) {
    parts.push(`import React from 'react';`);
    parts.push(`import { hydrate } from '@minimal-astro/runtime';`);
  }

  // Create the render function
  parts.push('');
  parts.push('// Component render function');
  parts.push('export async function render(props = {}) {');
  parts.push('  // Inject Astro global');
  parts.push('  const Astro = {');
  parts.push('    props,');
  parts.push('    request: {},');
  parts.push('    params: {},');
  parts.push('    url: new URL("http://localhost:3000/"),');
  parts.push('    slots: {}');
  parts.push('  };');

  // Add frontmatter code inside render function so it has access to Astro
  if (frontmatter) {
    parts.push('');
    parts.push('  // Frontmatter execution');
    // Strip TypeScript syntax from frontmatter code
    const strippedCode = stripTypeScript(frontmatter.code);
    // Indent the code for the render function
    const indentedCode = strippedCode
      .split('\n')
      .map((line) => (line ? '  ' + line : ''))
      .join('\n');
    parts.push(indentedCode);
  }

  const templateAst: FragmentNode = {
    type: 'Fragment',
    children: templateNodes,
    loc: ast.loc,
  };

  if (framework !== 'vanilla' && hasClientDirectives(ast)) {
    // Use React renderer for components with client directives
    const renderer = createSSRRenderer({
      hydrate: true,
      components,
      props: {},
    });

    parts.push('  // SSR with hydration support');
    parts.push(`  const renderResult = ${JSON.stringify(renderer.render(templateAst))};`);
    parts.push('  const { output, hydrationData, scripts } = renderResult;');
    parts.push('');
    parts.push('  // Combine HTML with hydration scripts');
    parts.push(
      '  const html = output + (scripts ? scripts.map(s => `<script>${s}</script>`).join("") : "");'
    );
    parts.push('  return { html, hydrationData };');
  } else {
    // Generate dynamic HTML at runtime
    parts.push('  // Build HTML dynamically with Astro context');
    parts.push(`  const { buildHtml } = await import('minimal-astro/core/html-builder');`);
    parts.push(`  const templateAst = ${JSON.stringify(templateAst)};`);
    parts.push(`  const html = buildHtml(templateAst, {`);
    parts.push(`    prettyPrint: ${prettyPrint},`);
    parts.push(`    evaluateExpressions: true`);
    parts.push(`  });`);
    parts.push('  return { html };');
  }

  parts.push('}');

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
  parts.push(`export default { render, metadata${framework !== 'vanilla' ? ', Component' : ''} };`);

  const jsCode = parts.join('\n');

  // Inject HMR code in development mode
  const finalCode = injectHmrCode(jsCode, filename, dev);

  // Generate source map if requested
  let sourceMap: string | undefined;
  if (options.sourceMap) {
    sourceMap = generateSourceMap(finalCode, filename, ast);
  }

  return {
    code: finalCode,
    map: sourceMap,
  };
}

/**
 * Generate a basic source map for the transformed code
 */
function generateSourceMap(code: string, filename: string, ast: FragmentNode): string {
  const lines = code.split('\n');
  const basename = filename.split('/').pop() ?? 'unknown.astro';

  // Enhanced source map that tracks sections more accurately
  const mappings: string[] = [];
  let generatedLine = 0;

  for (const line of lines) {
    if (line.includes('// Frontmatter')) {
      // Map frontmatter to line 2 (after opening ---)
      mappings.push('AAEA'); // Maps to line 2, column 0
    } else if (line.includes('// Component render function')) {
      // Map template section to the line after frontmatter
      const frontmatterEnd = ast.children.find((child) => child.type === 'Frontmatter') ? 10 : 2;
      mappings.push(encodeVLQ(0, 0, frontmatterEnd, 0));
    } else if (line.includes('export')) {
      // Map exports to end of file
      mappings.push('AAAA');
    } else {
      // Default mapping to original line 1
      mappings.push(generatedLine === 0 ? 'AAAA' : 'AACA');
    }
    generatedLine++;
  }

  const sourceMap = {
    version: 3,
    file: basename.replace('.astro', '.js'),
    sourceRoot: '',
    sources: [basename],
    names: [],
    mappings: mappings.join(';'),
  };

  return JSON.stringify(sourceMap);
}

/**
 * Encode a VLQ (Variable Length Quantity) for source map mappings
 * Simplified implementation for basic mapping
 */
function encodeVLQ(
  generatedColumn: number,
  sourceIndex: number,
  sourceLine: number,
  sourceColumn: number
): string {
  // This is a simplified VLQ encoder - in production, use a proper library
  const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function encodeNumber(num: number): string {
    let vlq = num < 0 ? (-num << 1) | 1 : num << 1;
    let result = '';

    do {
      let digit = vlq & 31;
      vlq >>>= 5;
      if (vlq > 0) {
        digit |= 32;
      }
      result += base64[digit];
    } while (vlq > 0);

    return result;
  }

  return [
    encodeNumber(generatedColumn),
    encodeNumber(sourceIndex),
    encodeNumber(sourceLine),
    encodeNumber(sourceColumn),
  ].join('');
}

/**
 * Extract client-side JavaScript from components
 */
export function extractClientScript(
  ast: FragmentNode,
  options: { framework?: 'react' | 'preact' | 'vanilla' } = {}
): string | null {
  const { framework = 'vanilla' } = options;

  if (!hasClientDirectives(ast)) {
    return null;
  }

  // Generate client-side hydration script
  const parts: string[] = [];

  parts.push('// Client-side hydration script');
  parts.push('(function() {');
  parts.push('  if (typeof window !== "undefined") {');

  if (framework === 'react') {
    parts.push('    import("@minimal-astro/runtime").then(({ autoHydrate }) => {');
    parts.push('      autoHydrate({');
    parts.push('        runtime: "react",');
    parts.push('        components: window.__ASTRO_COMPONENTS__ ?? new Map(),');
    parts.push('      });');
    parts.push('    });');
  } else if (framework === 'preact') {
    parts.push('    import("@minimal-astro/runtime").then(({ autoHydrate }) => {');
    parts.push('      autoHydrate({');
    parts.push('        runtime: "preact",');
    parts.push('        components: window.__ASTRO_COMPONENTS__ ?? new Map(),');
    parts.push('      });');
    parts.push('    });');
  }

  parts.push('  }');
  parts.push('})();');

  return parts.join('\n');
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
