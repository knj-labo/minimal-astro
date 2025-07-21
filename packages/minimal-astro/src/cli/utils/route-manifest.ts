import { join, relative } from 'node:path';
import type { Route, RouteManifest } from '../types.js';

/**
 * Creates a route pattern from a file path
 * Handles dynamic routes like [slug].astro
 */
function createRoutePattern(filePath: string, pagesDir: string): string {
  const relativePath = relative(pagesDir, filePath);
  const routePath = relativePath
    .replace(/\.astro$/, '')
    .replace(/\/index$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1'); // Convert [slug] to :slug

  // Handle root index
  if (routePath === '' || routePath === 'index') {
    return '/';
  }

  // Ensure leading slash
  return routePath.startsWith('/') ? routePath : `/${routePath}`;
}

/**
 * Extracts dynamic parameters from a route pattern
 */
function extractParams(pattern: string): readonly string[] {
  const matches = pattern.match(/:(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

/**
 * Creates a static pathname from a pattern (if it has no dynamic parts)
 */
function createPathname(pattern: string): string | undefined {
  // If pattern has dynamic parts, return undefined
  if (pattern.includes(':')) {
    return undefined;
  }
  return pattern;
}

/**
 * Converts a file path to a route object
 */
function filePathToRoute(filePath: string, pagesDir: string): Route {
  const pattern = createRoutePattern(filePath, pagesDir);
  const params = extractParams(pattern);
  const pathname = createPathname(pattern);

  return {
    pattern,
    component: filePath,
    pathname,
    params,
  } as const;
}

/**
 * Generates a route manifest from discovered page files
 */
export async function generateRouteManifest(
  pageFiles: readonly string[],
  root: string
): Promise<RouteManifest> {
  const pagesDir = join(root, 'src', 'pages');

  const routes = pageFiles.map((filePath) => filePathToRoute(filePath, pagesDir));

  // Sort routes by specificity (static routes first, then dynamic)
  const sortedRoutes = [...routes].sort((a, b) => {
    const aParams = a.params || [];
    const bParams = b.params || [];

    // Static routes (no params) come first
    if (aParams.length === 0 && bParams.length > 0) return -1;
    if (aParams.length > 0 && bParams.length === 0) return 1;

    // Among dynamic routes, fewer params come first
    if (aParams.length !== bParams.length) {
      return aParams.length - bParams.length;
    }

    // Alphabetical order for same specificity
    return a.pattern.localeCompare(b.pattern);
  });

  return {
    routes: sortedRoutes,
  } as const;
}
