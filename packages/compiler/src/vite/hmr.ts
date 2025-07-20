import type { HmrContext, ModuleNode } from 'vite';
import type { FragmentNode, Node, TextNode } from '../../types/ast.js';
import { hasClientDirectives } from './transform.js';

export interface HmrUpdateContext {
  file: string;
  modules: Array<ModuleNode>;
  server: HmrContext['server'];
  read: HmrContext['read'];
}

export interface AstroHmrState {
  hasClientDirectives: boolean;
  imports: string[];
  exports: string[];
  cssModules: string[];
  styleBlocks: string[];
  dependencies: Set<string>;
}

/**
 * Analyzes an AST to determine HMR boundaries and dependencies
 */
export function analyzeAstForHmr(ast: FragmentNode, _filePath: string): AstroHmrState {
  const state: AstroHmrState = {
    hasClientDirectives: hasClientDirectives(ast),
    imports: [],
    exports: [],
    cssModules: [],
    styleBlocks: [],
    dependencies: new Set(),
  };

  // Extract imports from frontmatter
  const frontmatter = ast.children.find((child) => child.type === 'Frontmatter');
  if (frontmatter && 'code' in frontmatter) {
    state.imports = extractImportsFromCode(frontmatter.code);
    state.cssModules = extractCssImports(frontmatter.code);

    // Track all dependencies
    for (const imp of state.imports) {
      state.dependencies.add(imp);
    }
    for (const css of state.cssModules) {
      state.dependencies.add(css);
    }
  }

  // Extract style blocks from the template
  state.styleBlocks = extractStyleBlocks(ast);

  return state;
}

/**
 * Determines if a component can be hot-reloaded or needs a full page reload
 */
export function canHotReload(oldState: AstroHmrState, newState: AstroHmrState): boolean {
  // If client directives changed, we need a full reload
  if (oldState.hasClientDirectives !== newState.hasClientDirectives) {
    return false;
  }

  // If imports changed, we need a full reload
  if (!arraysEqual(oldState.imports, newState.imports)) {
    return false;
  }

  // If exports changed, we need a full reload
  if (!arraysEqual(oldState.exports, newState.exports)) {
    return false;
  }

  // If CSS modules changed, we need a full reload
  if (!arraysEqual(oldState.cssModules, newState.cssModules)) {
    return false;
  }

  return true;
}

/**
 * Handles HMR updates for .astro files
 */
export function handleAstroHmr(
  ctx: HmrUpdateContext,
  oldState: AstroHmrState,
  newState: AstroHmrState
): ModuleNode[] {
  const { file, modules, server } = ctx;
  const affectedModules: ModuleNode[] = [];

  // If we can't hot reload, trigger a full page reload
  if (!canHotReload(oldState, newState)) {
    server.ws.send({
      type: 'full-reload',
      path: '*',
    });
    return modules;
  }

  // For now, we'll do a simple module update
  // In a more advanced implementation, we could:
  // 1. Update only the changed parts of the DOM
  // 2. Preserve component state where possible
  // 3. Handle CSS updates separately

  for (const mod of modules) {
    if (mod.file === file) {
      server.reloadModule(mod);
      affectedModules.push(mod);
    }
  }

  // Send custom HMR update message
  server.ws.send({
    type: 'custom',
    event: 'astro-update',
    data: {
      file,
      timestamp: Date.now(),
      hasClientDirectives: newState.hasClientDirectives,
    },
  });

  return affectedModules;
}

/**
 * Extracts import statements from frontmatter code
 */
function extractImportsFromCode(code: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"];?/g;

  let match: RegExpExecArray | null;
  match = importRegex.exec(code);
  while (match !== null) {
    imports.push(match[1]);
    match = importRegex.exec(code);
  }

  return imports;
}

/**
 * Utility function to compare arrays for equality
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

/**
 * Creates HMR client-side code for .astro components
 */
export function createHmrClientCode(filePath: string): string {
  return `
// HMR client code for ${filePath}
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // Handle module update
    if (newModule) {
      // Update the component
      console.log('[minimal-astro] Hot updated:', ${JSON.stringify(filePath)});
    }
  });

  // Listen for custom astro-update events
  import.meta.hot.on('astro-update', (data) => {
    if (data.file === ${JSON.stringify(filePath)}) {
      console.log('[minimal-astro] Component updated:', data);
      // In a full implementation, this would update the DOM
    }
  });
}
`;
}

/**
 * Injects HMR code into the transformed JavaScript
 */
export function injectHmrCode(jsCode: string, filePath: string, dev: boolean): string {
  if (!dev) {
    return jsCode;
  }

  const hmrCode = createHmrClientCode(filePath);
  return `${jsCode}\n\n${hmrCode}`;
}

/**
 * Extract CSS imports from frontmatter code
 */
function extractCssImports(code: string): string[] {
  const cssImports: string[] = [];
  const cssImportRegex = /import\s+['"']([^'"]*\.(?:css|scss|sass|less|styl|stylus))['"'];?/g;

  let match: RegExpExecArray | null;
  match = cssImportRegex.exec(code);
  while (match !== null) {
    cssImports.push(match[1]);
    match = cssImportRegex.exec(code);
  }

  return cssImports;
}

/**
 * Extract style blocks from AST nodes
 */
function extractStyleBlocks(ast: FragmentNode): string[] {
  const styleBlocks: string[] = [];

  function traverseNodes(nodes: Node[]): void {
    for (const node of nodes) {
      if (node.type === 'Element' && node.tag === 'style') {
        // Extract style content
        const styleContent = node.children
          .filter((child: Node) => child.type === 'Text')
          .map((child: Node) => (child as TextNode).value)
          .join('');
        if (styleContent.trim()) {
          styleBlocks.push(styleContent);
        }
      } else if (node.children) {
        traverseNodes(node.children);
      }
    }
  }

  traverseNodes(ast.children);
  return styleBlocks;
}

/**
 * Enhanced HMR update that handles CSS changes
 */
export function handleCssUpdate(
  ctx: HmrUpdateContext,
  oldState: AstroHmrState,
  newState: AstroHmrState
): void {
  const { server, file } = ctx;

  // Check for CSS module changes
  const cssChanged = !arraysEqual(oldState.cssModules, newState.cssModules);
  const styleChanged = !arraysEqual(oldState.styleBlocks, newState.styleBlocks);

  if (cssChanged || styleChanged) {
    // Send CSS update event
    server.ws.send({
      type: 'custom',
      event: 'astro-css-update',
      data: {
        file,
        cssModules: newState.cssModules,
        styleBlocks: newState.styleBlocks,
        timestamp: Date.now(),
      },
    });
  }
}

/**
 * Create error overlay for development
 */
export function createErrorOverlay(error: Error, filePath: string): string {
  const errorMessage = error.message;
  const stack = error.stack || '';

  return `
// Error overlay injection
if (import.meta.hot) {
  const errorOverlay = {
    show(error, file) {
      const overlay = document.createElement('div');
      overlay.id = 'minimal-astro-error-overlay';
      overlay.style.cssText = \`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        font-family: monospace;
        font-size: 14px;
        z-index: 9999999;
        padding: 20px;
        box-sizing: border-box;
        overflow: auto;
      \`;
      
      overlay.innerHTML = \`
        <div style="max-width: 800px; margin: 0 auto;">
          <h2 style="color: #ff6b6b; margin-top: 0;">Build Error in \${file}</h2>
          <pre style="background: #1a1a1a; padding: 20px; border-radius: 8px; overflow: auto;">
\${error.message}
          </pre>
          <details style="margin-top: 20px;">
            <summary style="cursor: pointer; color: #4ecdc4;">Stack Trace</summary>
            <pre style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin-top: 10px;">
\${error.stack || 'No stack trace available'}
            </pre>
          </details>
          <p style="margin-top: 20px; color: #999;">This overlay will disappear when the error is fixed.</p>
        </div>
      \`;
      
      // Remove existing overlay
      const existing = document.getElementById('minimal-astro-error-overlay');
      if (existing) {
        existing.remove();
      }
      
      document.body.appendChild(overlay);
    },
    
    hide() {
      const overlay = document.getElementById('minimal-astro-error-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
  };
  
  errorOverlay.show({
    message: ${JSON.stringify(errorMessage)},
    stack: ${JSON.stringify(stack)}
  }, ${JSON.stringify(filePath)});
  
  // Listen for successful updates to hide overlay
  import.meta.hot.on('astro-update', () => {
    errorOverlay.hide();
  });
}
`;
}
