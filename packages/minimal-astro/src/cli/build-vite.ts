import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer, build as viteBuild } from 'vite';
import type { InlineConfig } from 'vite';
import { astroVitePlugin } from '../vite-plugin-astro/plugin.js';
import { createAssetOptimizer } from './assets/optimizer.js';
import type { BuildOptions } from './types.js';
import { discoverAstroFiles } from './utils/file-discovery.js';
import { generateRouteManifest } from './utils/route-manifest.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ViteBuildOptions extends BuildOptions {
  readonly root: string;
  readonly outDir: string;
  readonly mode?: 'development' | 'production';
  readonly minify?: boolean;
  readonly sourcemap?: boolean;
}

interface BuildStats {
  readonly totalFiles: number;
  readonly htmlFiles: number;
  readonly jsFiles: number;
  readonly cssFiles: number;
  readonly buildTime: number;
}

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

/**
 * Creates Vite configuration for Astro build
 */
function createViteConfig(options: ViteBuildOptions): InlineConfig {
  const { root, outDir, mode = 'production', minify = true, sourcemap = false } = options;

  return {
    root,
    mode,
    plugins: [
      astroVitePlugin({
        dev: mode === 'development',
        prettyPrint: false, // Disable for production builds
        extensions: ['.astro'],
      }),
    ],
    build: {
      outDir,
      minify,
      sourcemap,
      rollupOptions: {
        input: [], // Will be populated with discovered pages
        output: {
          format: 'es',
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash][extname]',
        },
      },
      // Optimize for static site generation
      cssCodeSplit: true,
      assetsInlineLimit: 4096, // Inline small assets
      emptyOutDir: true,
    },
    server: {
      middlewareMode: true, // For SSR rendering during build
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'vue', 'svelte'], // Pre-bundle frameworks
    },
  } as const;
}

/**
 * Discovers pages from the project structure
 */
async function discoverPages(root: string): Promise<readonly string[]> {
  const pagesDir = join(root, 'src', 'pages');

  if (!existsSync(pagesDir)) {
    return [];
  }

  const astroFiles = await discoverAstroFiles(pagesDir);
  return astroFiles;
}

/**
 * Calculates build statistics
 */
function calculateBuildStats(startTime: number, outputFiles: readonly string[]): BuildStats {
  const endTime = Date.now();

  const htmlFiles = outputFiles.filter((f) => f.endsWith('.html')).length;
  const jsFiles = outputFiles.filter((f) => f.endsWith('.js')).length;
  const cssFiles = outputFiles.filter((f) => f.endsWith('.css')).length;

  return {
    totalFiles: outputFiles.length,
    htmlFiles,
    jsFiles,
    cssFiles,
    buildTime: endTime - startTime,
  } as const;
}

// ============================================================================
// SIDE EFFECTS
// ============================================================================

/**
 * Performs server-side rendering for all pages
 */
async function renderPages(
  pages: readonly string[],
  viteConfig: InlineConfig,
  _outDir: string
): Promise<void> {
  // Create a Vite dev server in middleware mode for SSR
  const server = await createServer({
    ...viteConfig,
    server: { middlewareMode: true },
  });

  try {
    for (const page of pages) {
      // Import and render each page
      await server.ssrLoadModule(page);

      // Generate output path
      const relativePath = page
        .replace(join(viteConfig.root!, 'src', 'pages'), '')
        .replace(/\.astro$/, '.html');

      // Render the page (this will be implemented when we have SSR renderers)
      // For now, we'll use the existing build logic
      console.log(`  Rendering: ${relativePath}`);
    }
  } finally {
    await server.close();
  }
}

/**
 * Logs build start
 */
function logBuildStart(mode: string): void {
  console.log(`\n🚀 Building in ${mode} mode...`);
  console.log('━'.repeat(50));
}

/**
 * Logs build progress
 */
function logBuildProgress(step: string, detail?: string): void {
  console.log(`\n${step}`);
  if (detail) {
    console.log(`  ${detail}`);
  }
}

/**
 * Logs build statistics
 */
function logBuildStats(stats: BuildStats): void {
  console.log('\n📊 Build Statistics:');
  console.log('━'.repeat(50));
  console.log(`  Total files:  ${stats.totalFiles}`);
  console.log(`  HTML files:   ${stats.htmlFiles}`);
  console.log(`  JS files:     ${stats.jsFiles}`);
  console.log(`  CSS files:    ${stats.cssFiles}`);
  console.log(`  Build time:   ${(stats.buildTime / 1000).toFixed(2)}s`);
  console.log('━'.repeat(50));
}

/**
 * Logs build completion
 */
function logBuildComplete(success: boolean, outDir: string): void {
  if (success) {
    console.log('\n✅ Build completed successfully!');
    console.log(`📁 Output: ${resolve(outDir)}`);
  } else {
    console.log('\n❌ Build failed with errors');
  }
}

// ============================================================================
// MAIN BUILD FUNCTION
// ============================================================================

/**
 * Enhanced build function using Vite
 */
export async function buildWithVite(options: ViteBuildOptions): Promise<void> {
  const startTime = Date.now();
  const { root, outDir, mode = 'production' } = options;

  try {
    // Log build start
    logBuildStart(mode);

    // Step 1: Discover pages
    logBuildProgress('📄 Discovering pages...');
    const pages = await discoverPages(root);

    if (pages.length === 0) {
      logBuildProgress('  No pages found in src/pages/');
      logBuildComplete(true, outDir);
      return;
    }

    logBuildProgress(`  Found ${pages.length} pages`);

    // Step 2: Generate route manifest
    logBuildProgress('🗺️  Generating route manifest...');
    const routeManifest = await generateRouteManifest(pages, root);
    logBuildProgress(`  Generated ${routeManifest.routes.length} routes`);

    // Step 3: Create Vite config
    const viteConfig = createViteConfig(options);

    // Update input files for Rollup
    if (viteConfig.build?.rollupOptions) {
      viteConfig.build.rollupOptions.input = [...pages]; // Convert readonly array to mutable
    }

    // Step 4: Pre-render pages (SSR)
    logBuildProgress('🎨 Pre-rendering pages...');
    await renderPages(pages, viteConfig, outDir);

    // Step 5: Build client-side assets
    logBuildProgress('📦 Building client assets...');
    await viteBuild(viteConfig);

    // Step 6: Asset optimization
    logBuildProgress('✨ Optimizing assets...');

    const assetOptimizer = createAssetOptimizer({
      outDir,
      minifyCSS: true,
      fingerprint: mode === 'production',
      images: {
        enabled: true,
        quality: 85,
      },
      inlineThreshold: 4096, // 4KB
    });

    // Optimize assets if they exist
    if (existsSync(outDir)) {
      try {
        const manifest = await assetOptimizer.optimizeDirectory(outDir);
        logBuildProgress(`  Optimized ${manifest.stats.totalFiles} assets`);

        // Save asset manifest for runtime use
        const manifestPath = join(outDir, 'asset-manifest.json');
        await import('node:fs/promises').then(({ writeFile }) =>
          writeFile(manifestPath, JSON.stringify(manifest, null, 2))
        );
      } catch (error) {
        console.warn('⚠️  Asset optimization failed:', error);
      }
    }

    // Calculate and log statistics
    const outputFiles: string[] = []; // TODO: Collect actual output files
    const stats = calculateBuildStats(startTime, outputFiles);
    logBuildStats(stats);

    // Log completion
    logBuildComplete(true, outDir);
  } catch (error) {
    console.error('\n💥 Build error:', error);
    logBuildComplete(false, outDir);
    throw error;
  }
}

/**
 * Main build entry point
 */
export async function build(options: BuildOptions): Promise<void> {
  const viteBuildOptions: ViteBuildOptions = {
    root: options.root || process.cwd(),
    outDir: options.outDir || 'dist',
    mode: 'production',
    minify: true,
    sourcemap: false,
  };

  await buildWithVite(viteBuildOptions);
}
