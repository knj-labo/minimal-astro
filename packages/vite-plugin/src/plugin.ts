import type { IncomingMessage, ServerResponse } from 'node:http';
import { parseAstro } from '@minimal-astro/compiler';
import type { Diagnostic, FragmentNode } from '@minimal-astro/types/ast';
import type { NextHandleFunction } from 'connect';
import type { ModuleNode, Plugin } from 'vite';
import {
  type AstroHmrState,
  analyzeAstForHmr,
  createErrorOverlay,
  handleAstroHmr,
  handleCssUpdate,
} from './hmr.js';
import { createContextualLogger } from './logger.js';
import { transformAstroToJs, type TransformOptions, type TransformResult } from './transform.js';

export interface AstroVitePluginOptions {
  /**
   * Enable development mode features
   */
  dev?: boolean;

  /**
   * Enable pretty printing for HTML output
   */
  prettyPrint?: boolean;

  /**
   * Custom file extensions to handle
   */
  extensions?: string[];
}

const DEFAULT_OPTIONS: Required<AstroVitePluginOptions> = {
  dev: false,
  prettyPrint: true,
  extensions: ['.astro'],
};

/**
 * Vite plugin for processing .astro files
 */
// Cache interfaces for performance optimization
interface CacheEntry<T> {
  value: T;
  hash: string;
  timestamp: number;
}

interface TransformCache {
  code: string;
  map?: string;
}

interface ParseCache {
  ast: unknown;
  diagnostics: Diagnostic[];
}

// Fast hash function for cache keys
function quickHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash.toString(36);
}

// Cache manager factory function
function createPluginCache(maxAge = 5 * 60 * 1000) {
  const astCache = new Map<string, CacheEntry<ParseCache>>();
  const transformCache = new Map<string, CacheEntry<TransformCache>>();
  const dependencyGraph = new Map<string, Set<string>>();

  const isExpired = (entry: CacheEntry<unknown>): boolean => {
    return Date.now() - entry.timestamp > maxAge;
  };

  return {
    getAst(id: string, code: string): ParseCache | null {
      const hash = quickHash(code);
      const entry = astCache.get(id);

      if (entry && entry.hash === hash && !isExpired(entry)) {
        return entry.value;
      }

      return null;
    },

    setAst(id: string, code: string, ast: unknown, diagnostics: Diagnostic[]): void {
      const hash = quickHash(code);
      astCache.set(id, {
        value: { ast, diagnostics },
        hash,
        timestamp: Date.now(),
      });
    },

    getTransform(id: string, code: string): TransformCache | null {
      const hash = quickHash(code);
      const entry = transformCache.get(id);

      if (entry && entry.hash === hash && !isExpired(entry)) {
        return entry.value;
      }

      return null;
    },

    setTransform(id: string, code: string, result: TransformCache): void {
      const hash = quickHash(code);
      transformCache.set(id, {
        value: result,
        hash,
        timestamp: Date.now(),
      });
    },

    setDependencies(id: string, dependencies: string[]): void {
      dependencyGraph.set(id, new Set(dependencies));
    },

    getDependents(id: string): string[] {
      const dependents: string[] = [];
      for (const [file, deps] of dependencyGraph.entries()) {
        if (deps.has(id)) {
          dependents.push(file);
        }
      }
      return dependents;
    },

    invalidate(id: string): void {
      astCache.delete(id);
      transformCache.delete(id);
      dependencyGraph.delete(id);
    },

    invalidateAll(): void {
      astCache.clear();
      transformCache.clear();
      dependencyGraph.clear();
    },

    cleanup(): void {
      const now = Date.now();

      for (const [id, entry] of astCache.entries()) {
        if (now - entry.timestamp > maxAge) {
          astCache.delete(id);
        }
      }

      for (const [id, entry] of transformCache.entries()) {
        if (now - entry.timestamp > maxAge) {
          transformCache.delete(id);
        }
      }
    },

    getDependencyGraph(): Map<string, Set<string>> {
      return dependencyGraph;
    },
  };
}

export function astroVitePlugin(options: AstroVitePluginOptions = {}): Plugin {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Store HMR state for each file
  const hmrStateMap = new Map<string, AstroHmrState>();

  // Initialize cache
  const cache = createPluginCache();

  // Create logger instance
  const logger = createContextualLogger({ plugin: 'astro-vite' });

  // Cleanup interval
  const cleanupInterval = setInterval(() => {
    cache.cleanup();
  }, 60000); // Every minute

  // Helper to check if a file is CSS-related
  function isCssFile(path: string): boolean {
    const cssExtensions = ['.css', '.scss', '.sass', '.less', '.styl', '.stylus'];
    return cssExtensions.some((ext) => path.endsWith(ext));
  }

  // Extract dependencies from AST
  function extractDependencies(ast: unknown): { all: string[]; css: string[] } {
    const dependencies: string[] = [];
    const cssDependencies: string[] = [];

    function walkNode(node: unknown): void {
      if (!node || typeof node !== 'object') return;

      const nodeObj = node as {
        type?: string;
        tag?: string;
        children?: unknown[];
      };

      if (nodeObj.type === 'Component' && nodeObj.tag) {
        // Component imports (e.g., <ComponentName />)
        dependencies.push(nodeObj.tag);
      }

      // Recursively walk children
      if (nodeObj.children) {
        nodeObj.children.forEach(walkNode);
      }
    }

    // Extract from frontmatter
    const astObj = ast as { children?: unknown[] };
    if (astObj.children) {
      const frontmatter = astObj.children.find((child: unknown) => {
        const childObj = child as { type?: string };
        return childObj.type === 'Frontmatter';
      }) as { code?: string } | undefined;
      if (frontmatter?.code) {
        const importMatches = frontmatter.code.match(/import\s+[^'"]+['"]([^'"]+)['"];?/g);
        if (importMatches) {
          for (const match of importMatches) {
            const pathMatch = match.match(/['"]([^'"]+)['"];?/);
            if (pathMatch) {
              const importPath = pathMatch[1];
              dependencies.push(importPath);

              // Track CSS dependencies separately for enhanced HMR
              if (isCssFile(importPath)) {
                cssDependencies.push(importPath);
              }
            }
          }
        }
      }
    }

    walkNode(astObj);

    return {
      all: [...new Set(dependencies)], // Remove duplicates
      css: [...new Set(cssDependencies)], // Remove duplicates
    };
  }

  return {
    name: 'minimal-astro',
    enforce: 'pre', // Run before other plugins including Vite's internal ones

    // Configure dev server to handle page requests
    configureServer(server) {
      // Define our middleware handler
      const astroDevHandler = async (
        req: IncomingMessage,
        res: ServerResponse,
        next: NextHandleFunction
      ) => {
        const url = req.url ?? '/';

        // Only handle GET requests to pages (not assets)
        if (req.method !== 'GET') {
          return next();
        }

        // Skip Vite special requests
        if (url.startsWith('/@')) {
          return next();
        }

        // Skip asset requests (files with extensions, except .html)
        const hasExtension = url.includes('.') && !url.endsWith('.html');
        if (hasExtension) {
          return next();
        }

        // Simple test endpoint
        if (url === '/ping') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain');
          res.end('pong from minimal-astro');
          return; // Never call next() after sending response
        }

        try {
          // Set status early to prevent Vite's 404 from taking over
          res.statusCode = 200;

          // Map URL to page file path
          let pagePath = url === '/' ? '/index' : url;
          pagePath = pagePath.replace(/\/$/, ''); // Remove trailing slash

          // Try to find the corresponding .astro file
          const possiblePaths = [
            `/src/pages${pagePath}.astro`,
            `/src/pages${pagePath}/index.astro`,
          ];

          let astroModule = null;
          let resolvedPath = '';

          for (const path of possiblePaths) {
            try {
              resolvedPath = server.config.root + path;

              // Force the file through Vite's transform pipeline first
              const module = server.moduleGraph.getModuleById(resolvedPath);
              if (!module || !module.ssrModule) {
                // Load the module which will trigger our transform
                astroModule = await server.ssrLoadModule(resolvedPath);
              } else {
                astroModule = module.ssrModule;
              }

              break;
            } catch (_e) {
              // Try next path
            }
          }

          // If no exact match, check for dynamic routes
          interface RouteParams {
            slug?: string;
            [key: string]: string | undefined;
          }
          let params: RouteParams = {};
          if (!astroModule) {
            // Simple dynamic route matching for [slug].astro
            const urlParts = url.split('/').filter(Boolean);
            if (urlParts.length > 0) {
              const basePath = urlParts.slice(0, -1).join('/');
              const dynamicPath = `/src/pages/${basePath ? `${basePath}/` : ''}[slug].astro`;

              logger.debug(`Checking dynamic route: ${dynamicPath} for URL: ${url}`);

              try {
                resolvedPath = server.config.root + dynamicPath;
                astroModule = await server.ssrLoadModule(resolvedPath);
                // Extract the slug parameter
                params = { slug: urlParts[urlParts.length - 1] };
                logger.debug(`Dynamic route matched! Slug: ${params.slug}`);
              } catch (e) {
                logger.debug(`Dynamic route not found: ${(e as Error).message}`);
              }
            }
          }

          if (!astroModule || !astroModule.render) {
            // Reset status code since we didn't find a page
            res.statusCode = 404;
            return next();
          }

          // Create Astro object with proper params and request info
          const Astro = {
            props: {},
            params,
            request: {
              url,
              method: req.method,
              headers: req.headers,
            },
            url: new URL(url, `http://${req.headers.host || 'localhost:3000'}`),
            slots: {},
          };

          // Render the page with Astro context
          const result = await astroModule.render({ Astro });

          // Send HTML response
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(result.html);
          return; // Never call next() after sending response
        } catch (error) {
          logger.error('Error rendering page', error as Error, { url });
          next(error);
        }
      };

      // Force our handler to be FIRST in the middleware stack
      server.middlewares.stack.unshift({
        route: '',
        handle: astroDevHandler,
      });

      logger.info('Minimal Astro dev middleware registered at front of stack');
    },

    // Handle .astro files
    load(id) {
      if (opts.extensions.some((ext) => id.endsWith(ext))) {
        // Let Vite handle the file reading, we'll transform in transform hook
        return null;
      }
      return null;
    },

    transform(code, id) {
      if (!opts.extensions.some((ext) => id.endsWith(ext))) {
        return null;
      }

      // Check if this is already transformed code
      if (code.includes('// Auto-generated from')) {
        console.warn(
          `[minimal-astro] WARNING: Attempting to transform already-transformed code for ${id}`
        );
        return null;
      }

      try {
        // Check transform cache first
        const cachedTransform = cache.getTransform(id, code);
        if (cachedTransform) {
          return cachedTransform;
        }

        // Check AST cache
        let parseResult: ParseCache;
        const cachedAst = cache.getAst(id, code);
        if (cachedAst) {
          parseResult = cachedAst;
        } else {
          // Parse the .astro file
          parseResult = parseAstro(code, {
            filename: id,
          });

          // Cache the AST
          cache.setAst(id, code, parseResult.ast, parseResult.diagnostics);
        }

        // Report any parsing errors
        if (parseResult.diagnostics.length > 0) {
          const errors = parseResult.diagnostics.filter((d) => d.severity === 'error');
          if (errors.length > 0) {
            const error = errors[0];
            throw new Error(
              `${error.code}: ${error.message} at ${id}:${error.loc.start.line}:${error.loc.start.column}`
            );
          }
        }

        // Analyze AST for HMR and extract dependencies
        const hmrState = analyzeAstForHmr(parseResult.ast as FragmentNode, id);
        const dependencyInfo = extractDependencies(parseResult.ast);

        // Store HMR state and dependencies for later comparison
        if (opts.dev) {
          hmrStateMap.set(id, hmrState);
          cache.setDependencies(id, dependencyInfo.all);

          // Log CSS dependencies for enhanced HMR
          if (dependencyInfo.css.length > 0) {
            logger.debug(`CSS dependencies found in ${id}`, {
              cssDeps: dependencyInfo.css,
            });
          }
        }

        // Transform to JavaScript module
        const transformOptions: TransformOptions = {
          filename: id,
          dev: opts.dev,
          prettyPrint: opts.prettyPrint,
          sourceMap: true,
        };
        const transformed = transformAstroToJs(parseResult.ast as FragmentNode, transformOptions);

        const result = {
          code: transformed.code,
          map: transformed.map ?? undefined,
        };

        // Cache the transform result
        cache.setTransform(id, code, result);

        return result;
      } catch (error) {
        // Re-throw with better error context
        throw new Error(
          `Failed to transform ${id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    // Handle HMR for .astro files and CSS files
    async handleHotUpdate(ctx) {
      const isAstroFile = opts.extensions.some((ext) => ctx.file.endsWith(ext));
      const isCssUpdate = isCssFile(ctx.file);

      if (!isAstroFile && !isCssUpdate) {
        return undefined;
      }

      if (!opts.dev) {
        return [];
      }

      // Handle CSS file updates
      if (isCssUpdate) {
        logger.debug(`CSS file updated: ${ctx.file}`);

        // Find all .astro files that depend on this CSS file
        const dependentAstroFiles: string[] = [];
        for (const [astroFile, deps] of cache.getDependencyGraph().entries()) {
          if (deps.has(ctx.file)) {
            dependentAstroFiles.push(astroFile);
          }
        }

        if (dependentAstroFiles.length > 0) {
          logger.info(`CSS change affects ${dependentAstroFiles.length} Astro files`, {
            cssFile: ctx.file,
            affected: dependentAstroFiles,
          });

          // Invalidate cache for affected files
          for (const astroFile of dependentAstroFiles) {
            cache.invalidate(astroFile);
          }
        }

        // Let Vite handle CSS HMR normally
        return undefined;
      }

      try {
        // Invalidate cache for this file
        cache.invalidate(ctx.file);

        // Find all files that depend on this file
        const dependents = cache.getDependents(ctx.file);
        const allAffected = [ctx.file, ...dependents];

        // Invalidate cache for all affected files
        for (const file of allAffected) {
          cache.invalidate(file);
        }

        // Read and parse the updated file with error handling
        const content = await ctx.read();
        let parseResult: { ast: FragmentNode; diagnostics: Diagnostic[] };

        try {
          parseResult = parseAstro(content, { filename: ctx.file });

          // Check for parsing errors
          if (parseResult.diagnostics.length > 0) {
            const errors = parseResult.diagnostics.filter(
              (d: Diagnostic) => d.severity === 'error'
            );
            if (errors.length > 0) {
              const error = errors[0];
              const errorMessage = `${error.code}: ${error.message} at ${ctx.file}:${error.loc.start.line}:${error.loc.start.column}`;
              const parseError = new Error(errorMessage);

              // Send error overlay to client
              const errorOverlay = createErrorOverlay(parseError, ctx.file);
              ctx.server.ws.send({
                type: 'custom',
                event: 'astro-error',
                data: {
                  file: ctx.file,
                  error: errorMessage,
                  overlay: errorOverlay,
                },
              });

              return [];
            }
          }
        } catch (error) {
          // Handle critical parsing errors
          const parseError = error instanceof Error ? error : new Error(String(error));
          const errorOverlay = createErrorOverlay(parseError, ctx.file);

          ctx.server.ws.send({
            type: 'custom',
            event: 'astro-error',
            data: {
              file: ctx.file,
              error: parseError.message,
              overlay: errorOverlay,
            },
          });

          return [];
        }

        // Analyze new HMR state and dependencies
        const newHmrState = analyzeAstForHmr(parseResult.ast as FragmentNode, ctx.file);
        const newDependencyInfo = extractDependencies(parseResult.ast);
        const oldHmrState = hmrStateMap.get(ctx.file);

        // Update dependencies in cache
        cache.setDependencies(ctx.file, newDependencyInfo.all);

        // Enhanced HMR for CSS changes
        if (newDependencyInfo.css.length > 0) {
          logger.debug(`Updated CSS dependencies in ${ctx.file}`, {
            cssDeps: newDependencyInfo.css,
          });
        }

        // Get all affected modules from Vite
        const affectedModules = new Set<ModuleNode>();

        // Add the changed file's modules
        for (const mod of ctx.modules) {
          affectedModules.add(mod);
        }

        // Add modules for dependent files
        for (const depFile of dependents) {
          const depModule = ctx.server.moduleGraph.getModuleById(depFile);
          if (depModule) {
            affectedModules.add(depModule);
          }
        }

        // Handle CSS updates separately
        if (oldHmrState) {
          handleCssUpdate(ctx, oldHmrState, newHmrState);
        }

        // Handle HMR update
        if (oldHmrState) {
          const hmrResult = handleAstroHmr(
            {
              file: ctx.file,
              modules: Array.from(affectedModules),
              server: ctx.server,
              read: ctx.read,
            },
            oldHmrState,
            newHmrState
          );

          // Update stored state
          hmrStateMap.set(ctx.file, newHmrState);

          return hmrResult;
        }

        // First time seeing this file, store state and do full reload
        hmrStateMap.set(ctx.file, newHmrState);
        ctx.server.ws.send({
          type: 'full-reload',
        });
        return Array.from(affectedModules);
      } catch (error) {
        // If parsing fails, do a full reload
        logger.error(
          `HMR error for ${ctx.file}`,
          error instanceof Error ? error : new Error(String(error)),
          { file: ctx.file }
        );

        // Invalidate cache for this file
        cache.invalidate(ctx.file);

        ctx.server.ws.send({
          type: 'full-reload',
        });
        return Array.from(ctx.modules);
      }
    },

    // Cleanup when plugin is destroyed
    buildEnd() {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
      cache.invalidateAll();
    },
  };
}
