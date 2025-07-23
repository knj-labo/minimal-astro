import { buildHtml } from '../core/html-builder.js';
import { astToJSX } from '@minimal-astro/internal-helpers';
import { createSSRRenderer } from '@minimal-astro/react';
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
  const frontmatterImports: string[] = [];
  const componentImports: Map<string, string> = new Map(); // component name -> import path
  let frontmatterCode = '';
  let getStaticPathsCode = '';

  if (frontmatter) {
    const code = frontmatter.code;
    const getStaticPathsRegex = /export\s+async\s+function\s+getStaticPaths\s*\([^)]*\)\s*\{[\s\S]*?^\}/m;
    const match = code.match(getStaticPathsRegex);

    if (match) {
      getStaticPathsCode = match[0];
      const remainingCode = code.replace(getStaticPathsRegex, '');
      const lines = remainingCode.split('\n');
      lines.forEach(line => {
        if (line.trim().startsWith('import')) {
          frontmatterImports.push(line);
          // Extract component imports
          const componentMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
          if (componentMatch && (componentMatch[2].endsWith('.astro') || componentMatch[2].endsWith('.jsx') || componentMatch[2].endsWith('.vue') || componentMatch[2].endsWith('.svelte'))) {
            componentImports.set(componentMatch[1], componentMatch[2]);
          }
        } else {
          frontmatterCode += line + '\n';
        }
      });
    } else {
      const lines = code.split('\n');
      lines.forEach(line => {
        if (line.trim().startsWith('import')) {
          frontmatterImports.push(line);
          // Extract component imports
          const componentMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
          if (componentMatch && (componentMatch[2].endsWith('.astro') || componentMatch[2].endsWith('.jsx') || componentMatch[2].endsWith('.vue') || componentMatch[2].endsWith('.svelte'))) {
            componentImports.set(componentMatch[1], componentMatch[2]);
          }
        } else {
          frontmatterCode += line + '\n';
        }
      });
    }
  }

  // Add imports that are commonly needed
  parts.push(`// Auto-generated from ${filename}`);
  
  // Import buildHtml at the top
  parts.push(`import { buildHtml } from 'minimal-astro/core/html-builder';`);
  parts.push(`import { renderUniversalComponent } from 'minimal-astro/core/renderer/universal-ssr';`);

  // Add frontmatter imports
  if (frontmatterImports.length > 0) {
    parts.push('');
    parts.push('// Frontmatter imports');
    parts.push(...frontmatterImports);
  }

  // Track component paths for client-side hydration
  const componentPaths: Record<string, string> = {};
  frontmatterImports.forEach(imp => {
    const match = imp.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (match) {
      const [, name, path] = match;
      // Convert relative paths for Vite client-side imports
      if (path.startsWith('.')) {
        // Find the project root (where blog example is)
        const projectRoot = filename.split('/examples/blog/')[0] + '/examples/blog';
        const fileDir = filename.substring(projectRoot.length).substring(0, filename.substring(projectRoot.length).lastIndexOf('/'));
        
        // Resolve the relative path
        let resolved = path;
        if (path.startsWith('../')) {
          // Go up one directory from /src/pages to /src
          resolved = '/src/' + path.substring(3);
        } else if (path.startsWith('./')) {
          resolved = fileDir + '/' + path.substring(2);
        }
        
        componentPaths[name] = resolved;
      } else {
        componentPaths[name] = path;
      }
    }
  });

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
  parts.push('  };');
  parts.push('  // Ensure props are accessible via Astro.props');
  parts.push('  if (!Astro.props) Astro.props = props;');

  // Add frontmatter code inside render function so it has access to Astro
  if (frontmatterCode) {
    parts.push('');
    parts.push('  // Frontmatter execution');
    // Strip TypeScript syntax from frontmatter code
    const strippedCode = stripTypeScript(frontmatterCode);
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
    parts.push('  try {');
    
    // Add component registry
    parts.push(`    // Component registry for rendering`);
    parts.push(`    const components = {};`);
    parts.push(`    const componentTypes = {};`);
    
    // Register imported components with their types
    for (const [name, path] of componentImports) {
      parts.push(`    components['${name}'] = ${name};`);
      // Detect component type from path
      if (path.endsWith('.jsx') || path.endsWith('.tsx')) {
        parts.push(`    componentTypes['${name}'] = 'react';`);
      } else if (path.endsWith('.vue')) {
        parts.push(`    componentTypes['${name}'] = 'vue';`);
      } else if (path.endsWith('.svelte')) {
        parts.push(`    componentTypes['${name}'] = 'svelte';`);
      } else {
        parts.push(`    componentTypes['${name}'] = 'astro';`);
      }
    }
    
    parts.push(`    `);
    parts.push(`    // Process AST to replace expressions and render components`);
    parts.push(`    async function processAstNode(node, context) {`);
    parts.push(`      if (node.type === 'Expression') {`);
    parts.push(`        try {`);
    parts.push(`          // Create a function that has access to context variables`);
    parts.push(`          const func = new Function(...Object.keys(context), 'return ' + node.code);`);
    parts.push(`          const value = func(...Object.values(context));`);
    parts.push(`          return { type: 'Text', value: String(value) };`);
    parts.push(`        } catch (e) {`);
    parts.push(`          return { type: 'Text', value: '' };`);
    parts.push(`        }`);
    parts.push(`      }`);
    parts.push(`      `);
    parts.push(`      // Handle Component nodes`);
    parts.push(`      if (node.type === 'Component') {`);
    parts.push(`        const Component = components[node.tag];`);
    parts.push(`        const componentType = componentTypes[node.tag] || 'astro';`);
    parts.push(`        `);
    parts.push(`        if (Component) {`);
    parts.push(`          // Process component attributes`);
    parts.push(`          const props = {};`);
    parts.push(`          let hasClientDirective = false;`);
    parts.push(`          `);
    parts.push(`          if (node.attrs) {`);
    parts.push(`            for (const attr of node.attrs) {`);
    parts.push(`              let value = attr.value;`);
    parts.push(`              // Check for client directives`);
    parts.push(`              if (attr.name.startsWith('client:')) {`);
    parts.push(`                hasClientDirective = true;`);
    parts.push(`                props[attr.name] = value || true;`);
    parts.push(`                continue;`);
    parts.push(`              }`);
    parts.push(`              // Evaluate expression attributes`);
    parts.push(`              if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {`);
    parts.push(`                try {`);
    parts.push(`                  const exprCode = value.slice(1, -1);`);
    parts.push(`                  const func = new Function(...Object.keys(context), 'return ' + exprCode);`);
    parts.push(`                  value = func(...Object.values(context));`);
    parts.push(`                } catch (e) {`);
    parts.push(`                  // Keep original value on error`);
    parts.push(`                }`);
    parts.push(`              }`);
    parts.push(`              props[attr.name] = value;`);
    parts.push(`            }`);
    parts.push(`          }`);
    parts.push(`          `);
    parts.push(`          // Handle different component types`);
    parts.push(`          if (componentType === 'astro' && typeof Component.render === 'function') {`);
    parts.push(`            // Astro component - handle slots`);
    parts.push(`            const slotFunction = async () => {`);
    parts.push(`              if (!node.children || node.children.length === 0) return '';`);
    parts.push(`              `);
    parts.push(`              const childContext = { ...context };`);
    parts.push(`              const processedChildren = [];`);
    parts.push(`              `);
    parts.push(`              for (const child of node.children) {`);
    parts.push(`                const processed = await processAstNode(child, childContext);`);
    parts.push(`                if (processed.type === 'Text' && !processed.value.trim()) continue;`);
    parts.push(`                processedChildren.push(processed);`);
    parts.push(`              }`);
    parts.push(`              `);
    parts.push(`              const html = buildHtml({ type: 'Fragment', children: processedChildren }, {`);
    parts.push(`                prettyPrint: false,`);
    parts.push(`                evaluateExpressions: false,`);
    parts.push(`                escapeHtml: false`);
    parts.push(`              });`);
    parts.push(`              return html;`);
    parts.push(`            };`);
    parts.push(`            `);
    parts.push(`            const componentAstro = {`);
    parts.push(`              ...context.Astro,`);
    parts.push(`              props: props,`);
    parts.push(`              slots: { default: slotFunction }`);
    parts.push(`            };`);
    parts.push(`            `);
    parts.push(`            const result = await Component.render({ ...props, Astro: componentAstro });`);
    parts.push(`            return { type: 'RawHTML', value: result.html || '' };`);
    parts.push(`          } else {`);
    parts.push(`            // Framework component (React/Vue/Svelte)`);
    parts.push(`            const registries = {`);
    parts.push(`              react: new Map([[node.tag, Component]]),`);
    parts.push(`              vue: new Map([[node.tag, Component]]),`);
    parts.push(`              svelte: new Map([[node.tag, Component]])`);
    parts.push(`            };`);
    parts.push(`            `);
    parts.push(`            const result = await renderUniversalComponent(node.tag, props, componentType, {`);
    parts.push(`              reactComponents: componentType === 'react' ? registries.react : undefined,`);
    parts.push(`              vueComponents: componentType === 'vue' ? registries.vue : undefined,`);
    parts.push(`              svelteComponents: componentType === 'svelte' ? registries.svelte : undefined,`);
    parts.push(`              generateHydrationData: hasClientDirective,`);
    parts.push(`              dev: ${dev}`);
    parts.push(`            });`);
    parts.push(`            `);
    parts.push(`            return { type: 'RawHTML', value: result.html };`);
    parts.push(`          }`);
    parts.push(`        }`);
    parts.push(`        // If component not found, return comment`);
    parts.push(`        return { type: 'Text', value: '<!-- Component: ' + node.tag + ' -->' };`);
    parts.push(`      }`);
    parts.push(`      `);
    parts.push(`      // Handle slot elements`);
    parts.push(`      if (node.type === 'Element' && node.tag === 'slot') {`);
    parts.push(`        const slotName = node.attrs?.find(attr => attr.name === 'name')?.value || 'default';`);
    parts.push(`        if (context.Astro && context.Astro.slots && typeof context.Astro.slots[slotName] === 'function') {`);
    parts.push(`          const slotContent = await context.Astro.slots[slotName]();`);
    parts.push(`          return { type: 'RawHTML', value: slotContent };`);
    parts.push(`        }`);
    parts.push(`        // Return empty if no slot content`);
    parts.push(`        return { type: 'Text', value: '' };`);
    parts.push(`      }`);
    parts.push(`      `);
    parts.push(`      // Process element/component attributes`);
    parts.push(`      if (node.type === 'Element' && node.attrs) {`);
    parts.push(`        node.attrs = await Promise.all(node.attrs.map(async attr => {`);
    parts.push(`          // Check if attribute value contains an expression`);
    parts.push(`          if (typeof attr.value === 'string' && attr.value.startsWith('{') && attr.value.endsWith('}')) {`);
    parts.push(`            try {`);
    parts.push(`              const exprCode = attr.value.slice(1, -1);`);
    parts.push(`              const func = new Function(...Object.keys(context), 'return ' + exprCode);`);
    parts.push(`              const value = func(...Object.values(context));`);
    parts.push(`              return { ...attr, value: String(value) };`);
    parts.push(`            } catch (e) {`);
    parts.push(`              return attr;`);
    parts.push(`            }`);
    parts.push(`          }`);
    parts.push(`          return attr;`);
    parts.push(`        }));`);
    parts.push(`      }`);
    parts.push(`      `);
    parts.push(`      // Process children recursively`);
    parts.push(`      if (node.children) {`);
    parts.push(`        node.children = await Promise.all(node.children.map(child => processAstNode(child, context)));`);
    parts.push(`      }`);
    parts.push(`      `);
    parts.push(`      return node;`);
    parts.push(`    }`);
    parts.push(`    `);
    parts.push(`    // Create context object with all variables in scope`);
    parts.push(`    const evalContext = { Astro };`);
    
    // Add frontmatter variables to context
    if (frontmatter) {
      // Match regular variable declarations
      const varMatches = frontmatter.code.match(/(?:const|let|var)\s+(\w+)/g);
      if (varMatches) {
        varMatches.forEach(match => {
          const varName = match.replace(/(?:const|let|var)\s+/, '');
          parts.push(`    try { evalContext.${varName} = ${varName}; } catch(e) {}`);
        });
      }
      
      // Match destructured variables
      const destructureMatches = frontmatter.code.match(/(?:const|let|var)\s*\{([^}]+)\}\s*=/g);
      if (destructureMatches) {
        destructureMatches.forEach(match => {
          // Extract variable names from destructuring
          const varsSection = match.match(/\{([^}]+)\}/)?.[1];
          if (varsSection) {
            // Split by comma and extract variable names (handling renaming and defaults)
            const vars = varsSection.split(',').map(v => {
              // Handle: varName, varName: renamed, varName = default
              const trimmed = v.trim();
              const varName = trimmed.split(/[:=]/)[0].trim();
              return varName;
            }).filter(v => v);
            
            vars.forEach(varName => {
              parts.push(`    try { evalContext.${varName} = ${varName}; } catch(e) {}`);
            });
          }
        });
      }
    }
    
    
    parts.push(`    `);
    parts.push(`    // Clone the template AST and process expressions`);
    parts.push(`    const processedAst = JSON.parse(JSON.stringify(${JSON.stringify(templateAst)}));`);
    parts.push(`    // Pass Astro context directly to processAstNode`);
    parts.push(`    const fullContext = { ...evalContext, Astro };`);
    parts.push(`    await processAstNode(processedAst, fullContext);`);
    parts.push(`    `);
    parts.push(`    let html = buildHtml(processedAst, {`);
    parts.push(`      prettyPrint: ${prettyPrint},`);
    parts.push(`      evaluateExpressions: false,`);
    parts.push(`      escapeHtml: false`);
    parts.push(`    });`);
    parts.push(`    `);
    parts.push(`    // Add hydration script if there are any client components`);
    parts.push(`    const hasClientComponents = Object.keys(componentTypes).some(name => {`);
    parts.push(`      return componentTypes[name] !== 'astro';`);
    parts.push(`    });`);
    parts.push(`    `);
    parts.push(`    `);
    parts.push(`    if (hasClientComponents && html.includes('astro-island')) {`);
    parts.push(`      const hydrationScript = \`<script type="module">`);
    parts.push(`// Simple hydration script for minimal-astro`);
    parts.push(`(function() {`);
    parts.push(`  const componentModules = {};`);
    parts.push(`  const componentTypes = \${JSON.stringify(componentTypes)};`);
    parts.push(`  const componentPaths = \${JSON.stringify(${JSON.stringify(componentPaths)})};`);
    parts.push(`  `);
    parts.push(`  async function hydrateComponent(island) {`);
    parts.push(`    const componentName = island.getAttribute('component-export');`);
    parts.push(`    const propsStr = island.getAttribute('component-props');`);
    parts.push(`    const directive = island.getAttribute('client-directive');`);
    parts.push(`    `);
    parts.push(`    if (!componentName || !directive) return;`);
    parts.push(`    `);
    parts.push(`    console.log('Hydrating component:', componentName, 'with directive:', directive);`);
    parts.push(`    `);
    parts.push(`    let props = {};`);
    parts.push(`    try {`);
    parts.push(`      props = propsStr ? JSON.parse(propsStr) : {};`);
    parts.push(`    } catch (e) {`);
    parts.push(`      console.error('Failed to parse props:', e);`);
    parts.push(`    }`);
    parts.push(`    `);
    parts.push(`    const Component = componentModules[componentName];`);
    parts.push(`    if (!Component) {`);
    parts.push(`      console.error('Component not loaded:', componentName);`);
    parts.push(`      return;`);
    parts.push(`    }`);
    parts.push(`    `);
    parts.push(`    const type = componentTypes[componentName];`);
    parts.push(`    console.log('Component type:', type);`);
    parts.push(`    `);
    parts.push(`    try {`);
    parts.push(`    if (type === 'react') {`);
    parts.push(`      console.log('Hydrating React component...');`);
    parts.push(`      const React = await import('react');`);
    parts.push(`      console.log('React loaded:', React);`);
    parts.push(`      const ReactDOM = await import('react-dom/client');`);
    parts.push(`      console.log('ReactDOM loaded:', ReactDOM);`);
    parts.push(`      const root = ReactDOM.createRoot(island);`);
    parts.push(`      const ReactComponent = Component.default || Component;`);
    parts.push(`      console.log('Creating element with component:', ReactComponent, 'props:', props);`);
    parts.push(`      root.render(React.createElement(ReactComponent, props));`);
    parts.push(`    } else if (type === 'vue') {`);
    parts.push(`      const { createApp } = await import('vue');`);
    parts.push(`      if (directive === 'only') island.innerHTML = '';`);
    parts.push(`      const app = createApp(Component.default || Component, props);`);
    parts.push(`      app.mount(island);`);
    parts.push(`    } else if (type === 'svelte') {`);
    parts.push(`      if (directive === 'only') island.innerHTML = '';`);
    parts.push(`      new (Component.default || Component)({`);
    parts.push(`        target: island,`);
    parts.push(`        props,`);
    parts.push(`        hydrate: directive !== 'only'`);
    parts.push(`      });`);
    parts.push(`    }`);
    parts.push(`    } catch (e) {`);
    parts.push(`      console.error('Failed to hydrate component:', componentName, e);`);
    parts.push(`    }`);
    parts.push(`  }`);
    parts.push(`  `);
    parts.push(`  // Hydration strategies`);
    parts.push(`  async function setupHydration() {`);
    parts.push(`    console.log('Setting up hydration with paths:', componentPaths);`);
    parts.push(`    // Load components first`);
    parts.push(`    const imports = [];`);
    parts.push(`    for (const [name, path] of Object.entries(componentPaths)) {`);
    parts.push(`      if (componentTypes[name] && componentTypes[name] !== 'astro') {`);
    parts.push(`        console.log('Loading component:', name, 'from:', path);`);
    parts.push(`        imports.push(`);
    parts.push(`          import(/* @vite-ignore */ path)`);
    parts.push(`            .then(m => {`);
    parts.push(`              componentModules[name] = m;`);
    parts.push(`              console.log('Loaded component:', name, m);`);
    parts.push(`              return m;`);
    parts.push(`            })`);
    parts.push(`            .catch(e => {`);
    parts.push(`              console.error('Failed to load component:', name, 'from path:', path, e);`);
    parts.push(`              // Try with .default export`);
    parts.push(`              return import(/* @vite-ignore */ path + '?t=' + Date.now());`);
    parts.push(`            })`);
    parts.push(`        );`);
    parts.push(`      }`);
    parts.push(`    }`);
    parts.push(`    await Promise.all(imports);`);
    parts.push(`    console.log('All components loaded:', componentModules);`);
    parts.push(`    `);
    parts.push(`    // client:load`);
    parts.push(`    document.querySelectorAll('astro-island[client-directive="load"]').forEach(hydrateComponent);`);
    parts.push(`    `);
    parts.push(`    // client:only`);
    parts.push(`    document.querySelectorAll('astro-island[client-directive="only"]').forEach(hydrateComponent);`);
    parts.push(`    `);
    parts.push(`    // client:idle`);
    parts.push(`    const idleIslands = document.querySelectorAll('astro-island[client-directive="idle"]');`);
    parts.push(`    if (idleIslands.length > 0) {`);
    parts.push(`      if ('requestIdleCallback' in window) {`);
    parts.push(`        idleIslands.forEach(island => requestIdleCallback(() => hydrateComponent(island)));`);
    parts.push(`      } else {`);
    parts.push(`        setTimeout(() => idleIslands.forEach(hydrateComponent), 200);`);
    parts.push(`      }`);
    parts.push(`    }`);
    parts.push(`    `);
    parts.push(`    // client:visible`);
    parts.push(`    const visibleIslands = document.querySelectorAll('astro-island[client-directive="visible"]');`);
    parts.push(`    if (visibleIslands.length > 0 && 'IntersectionObserver' in window) {`);
    parts.push(`      const observer = new IntersectionObserver((entries) => {`);
    parts.push(`        entries.forEach(entry => {`);
    parts.push(`          if (entry.isIntersecting) {`);
    parts.push(`            hydrateComponent(entry.target);`);
    parts.push(`            observer.unobserve(entry.target);`);
    parts.push(`          }`);
    parts.push(`        });`);
    parts.push(`      });`);
    parts.push(`      visibleIslands.forEach(island => observer.observe(island));`);
    parts.push(`    } else {`);
    parts.push(`      visibleIslands.forEach(hydrateComponent);`);
    parts.push(`    }`);
    parts.push(`  }`);
    parts.push(`  `);
    parts.push(`  if (document.readyState === 'loading') {`);
    parts.push(`    document.addEventListener('DOMContentLoaded', setupHydration);`);
    parts.push(`  } else {`);
    parts.push(`    setupHydration();`);
    parts.push(`  }`);
    parts.push(`})();`);
    parts.push(`</script>\`;`);
    parts.push(`      `);
    parts.push(`      // Inject script before closing body tag`);
    parts.push(`      if (html.includes('</body>')) {`);
    parts.push(`        html = html.replace('</body>', hydrationScript + '</body>');`);
    parts.push(`      } else {`);
    parts.push(`        html += hydrationScript;`);
    parts.push(`      }`);
    parts.push(`    }`);
    parts.push(`    `);
    parts.push('    return { html };');
    parts.push('  } catch (error) {');
    parts.push('    console.error("Failed to build HTML:", error);');
    parts.push('    return { html: "Error: " + error.message };');
    parts.push('  }');
  }

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
  parts.push(`export default { render, metadata${framework !== 'vanilla' ? ', Component' : ''}${getStaticPathsCode ? ', getStaticPaths' : ''} };`);

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
