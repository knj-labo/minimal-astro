/**
 * Asset optimization for Minimal Astro
 * Handles CSS optimization, image processing, and asset fingerprinting
 */

import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { createContextualLogger } from '../../core/utils/logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AssetOptimizerOptions {
  /**
   * Output directory for optimized assets
   */
  outDir: string;

  /**
   * Enable CSS minification
   */
  minifyCSS?: boolean;

  /**
   * Enable asset fingerprinting
   */
  fingerprint?: boolean;

  /**
   * Image optimization settings
   */
  images?: {
    /**
     * Enable image optimization
     */
    enabled?: boolean;

    /**
     * Quality for JPEG compression (0-100)
     */
    quality?: number;

    /**
     * Generate different sizes
     */
    sizes?: number[];
  };

  /**
   * Asset inlining threshold (bytes)
   */
  inlineThreshold?: number;
}

export interface OptimizationResult {
  /**
   * Original file path
   */
  originalPath: string;

  /**
   * Optimized file path
   */
  optimizedPath: string;

  /**
   * Original file size in bytes
   */
  originalSize: number;

  /**
   * Optimized file size in bytes
   */
  optimizedSize: number;

  /**
   * Compression ratio (0-1)
   */
  compressionRatio: number;

  /**
   * Asset hash for fingerprinting
   */
  hash?: string;
}

export interface AssetManifest {
  /**
   * Map of original paths to optimized paths
   */
  assets: Record<string, string>;

  /**
   * Optimization statistics
   */
  stats: {
    totalFiles: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    compressionRatio: number;
  };
}

// ============================================================================
// ASSET UTILITIES
// ============================================================================

/**
 * Generates a content hash for asset fingerprinting
 */
function generateAssetHash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

/**
 * Creates a fingerprinted filename
 */
function createFingerprintedName(filePath: string, hash: string): string {
  const ext = extname(filePath);
  const name = basename(filePath, ext);
  const dir = dirname(filePath);

  return join(dir, `${name}.${hash}${ext}`);
}

/**
 * Checks if a file should be inlined based on size
 */
function shouldInlineAsset(size: number, threshold: number): boolean {
  return size <= threshold;
}

/**
 * Gets MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

// ============================================================================
// CSS OPTIMIZATION
// ============================================================================

/**
 * Minifies CSS content
 */
function minifyCSS(css: string): string {
  return (
    css
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around certain characters
      .replace(/\s*([{}:;,>+~])\s*/g, '$1')
      // Remove trailing semicolons
      .replace(/;}/g, '}')
      // Remove leading/trailing whitespace
      .trim()
  );
}

// ============================================================================
// IMAGE OPTIMIZATION
// ============================================================================

/**
 * Basic image optimization (placeholder implementation)
 * In production, you'd use libraries like sharp or imagemin
 */
function optimizeImage(
  content: Buffer,
  filePath: string,
  options: NonNullable<AssetOptimizerOptions['images']>
): Buffer {
  // This is a placeholder - real implementation would use image processing libraries
  const logger = createContextualLogger({ module: 'asset-optimizer' });

  logger.debug(`Image optimization for ${filePath}`, {
    originalSize: content.length,
    quality: options.quality,
  });

  // For now, just return the original content
  // TODO: Implement actual image optimization with sharp/imagemin
  return content;
}

// ============================================================================
// MAIN OPTIMIZER
// ============================================================================

/**
 * Optimizes a single asset file
 */
async function optimizeAsset(
  filePath: string,
  outDir: string,
  options: AssetOptimizerOptions
): Promise<OptimizationResult> {
  const logger = createContextualLogger({ module: 'asset-optimizer' });

  try {
    // Read original file
    const originalContent = await readFile(filePath);
    const originalSize = originalContent.length;
    const ext = extname(filePath).toLowerCase();

    let optimizedContent = originalContent;

    // Apply optimizations based on file type
    if (ext === '.css' && options.minifyCSS) {
      const cssContent = originalContent.toString('utf-8');
      const minifiedCSS = minifyCSS(cssContent);
      optimizedContent = Buffer.from(minifiedCSS, 'utf-8');
    } else if (
      ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext) &&
      options.images?.enabled
    ) {
      optimizedContent = optimizeImage(originalContent, filePath, options.images);
    }

    // Generate hash for fingerprinting
    let hash: string | undefined;
    let outputPath = filePath;

    if (options.fingerprint) {
      hash = generateAssetHash(optimizedContent);
      outputPath = createFingerprintedName(filePath, hash);
    }

    // Create output path - outputPath is already a full path, so we need to make it relative to outDir
    const relativePath = filePath.startsWith(outDir) 
      ? filePath.slice(outDir.length).replace(/^\//, '') 
      : filePath;
    const finalOutputPath = options.fingerprint ? createFingerprintedName(relativePath, hash!) : relativePath;
    const outputFilePath = join(outDir, finalOutputPath);

    // Ensure output directory exists
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dirname(outputFilePath), { recursive: true });
    await writeFile(outputFilePath, optimizedContent);

    const optimizedSize = optimizedContent.length;
    const compressionRatio = originalSize > 0 ? optimizedSize / originalSize : 1;

    logger.debug(`Optimized ${filePath}`, {
      originalSize,
      optimizedSize,
      compressionRatio: (1 - compressionRatio) * 100,
    });

    return {
      originalPath: filePath,
      optimizedPath: outputPath,
      originalSize,
      optimizedSize,
      compressionRatio,
      hash,
    };
  } catch (error) {
    logger.error(`Failed to optimize ${filePath}`, error as Error);
    throw error;
  }
}

/**
 * Discovers all assets in a directory
 */
async function discoverAssets(dir: string): Promise<string[]> {
  const assets: string[] = [];

  const discover = async (currentDir: string): Promise<void> => {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await discover(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();

          // Include common web assets
          if (
            [
              '.css',
              '.js',
              '.png',
              '.jpg',
              '.jpeg',
              '.gif',
              '.svg',
              '.webp',
              '.woff',
              '.woff2',
              '.ttf',
              '.otf',
            ].includes(ext)
          ) {
            assets.push(fullPath);
          }
        }
      }
    } catch (_error) {
      // Ignore directories that can't be read
    }
  };

  await discover(dir);
  return assets;
}

/**
 * Creates an asset optimizer
 */
export function createAssetOptimizer(options: AssetOptimizerOptions) {
  const logger = createContextualLogger({ module: 'asset-optimizer' });

  return {
    /**
     * Optimize a single asset
     */
    async optimizeAsset(filePath: string): Promise<OptimizationResult> {
      return optimizeAsset(filePath, options.outDir, options);
    },

    /**
     * Optimize all assets in a directory
     */
    async optimizeDirectory(sourceDir: string): Promise<AssetManifest> {
      logger.info(`Starting asset optimization for ${sourceDir}`);

      // Discover all assets
      const assetPaths = await discoverAssets(sourceDir);
      logger.info(`Found ${assetPaths.length} assets to optimize`);

      // Optimize assets in parallel (with concurrency limit)
      const results: OptimizationResult[] = [];
      const concurrency = 5;

      for (let i = 0; i < assetPaths.length; i += concurrency) {
        const batch = assetPaths.slice(i, i + concurrency);
        const batchResults = await Promise.allSettled(
          batch.map((path) => this.optimizeAsset(path))
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            logger.error('Asset optimization failed', result.reason);
          }
        }
      }

      // Create asset manifest
      const assets: Record<string, string> = {};
      let totalOriginalSize = 0;
      let totalOptimizedSize = 0;

      for (const result of results) {
        assets[result.originalPath] = result.optimizedPath;
        totalOriginalSize += result.originalSize;
        totalOptimizedSize += result.optimizedSize;
      }

      const compressionRatio = totalOriginalSize > 0 ? totalOptimizedSize / totalOriginalSize : 1;

      const manifest: AssetManifest = {
        assets,
        stats: {
          totalFiles: results.length,
          totalOriginalSize,
          totalOptimizedSize,
          compressionRatio,
        },
      };

      logger.info('Asset optimization completed', {
        files: results.length,
        originalSize: Math.round(totalOriginalSize / 1024),
        optimizedSize: Math.round(totalOptimizedSize / 1024),
        savings: Math.round((1 - compressionRatio) * 100),
      });

      return manifest;
    },

    /**
     * Generate a data URI for small assets
     */
    async generateDataURI(filePath: string): Promise<string | null> {
      try {
        const content = await readFile(filePath);

        if (shouldInlineAsset(content.length, options.inlineThreshold || 4096)) {
          const mimeType = getMimeType(filePath);
          const base64 = content.toString('base64');
          return `data:${mimeType};base64,${base64}`;
        }

        return null;
      } catch {
        return null;
      }
    },
  };
}
