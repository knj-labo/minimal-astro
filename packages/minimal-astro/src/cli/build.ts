import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { buildHtml } from '@minimal-astro/compiler/html-builder';
import { parseAstro } from '@minimal-astro/compiler/parser';
import type { Diagnostic } from '@minimal-astro/types/ast';

// ============================================================================
// TYPES - Immutable and well-defined
// ============================================================================

export interface BuildOptions {
  readonly inputDir: string;
  readonly outputDir: string;
  readonly concurrency?: number;
}

interface BuildResult {
  readonly success: boolean;
  readonly processedFiles: number;
  readonly errors: number;
  readonly warnings: number;
  readonly diagnostics: readonly Diagnostic[];
}

interface ProcessResult {
  readonly success: boolean;
  readonly filePath: string;
  readonly outputPath: string;
  readonly diagnostics: readonly Diagnostic[];
}

interface FileProcessingContext {
  readonly inputPath: string;
  readonly inputDir: string;
  readonly outputDir: string;
  readonly relativePath: string;
}

interface BuildSummary {
  readonly totalFiles: number;
  readonly successfulFiles: number;
  readonly errors: number;
  readonly warnings: number;
  readonly allDiagnostics: readonly Diagnostic[];
  readonly success: boolean;
}

// ============================================================================
// PURE FUNCTIONS - No side effects, immutable
// ============================================================================

/**
 * Recursively discovers all .astro files in a directory
 * Pure function - only reads, doesn't modify anything
 */
async function discoverAstroFiles(dir: string): Promise<readonly string[]> {
  const collectFiles = async (currentDir: string): Promise<readonly string[]> => {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      const results = await Promise.all(
        entries.map(async (entry): Promise<readonly string[]> => {
          const fullPath = join(currentDir, entry.name);

          if (entry.isDirectory()) {
            return collectFiles(fullPath);
          }

          if (entry.isFile() && extname(entry.name) === '.astro') {
            return [fullPath] as const;
          }

          return [] as const;
        })
      );

      return results.flat();
    } catch {
      throw new Error(`Failed to read directory: ${currentDir}`);
    }
  };

  return collectFiles(dir);
}

/**
 * Creates output path from input path
 * Pure function - no side effects
 */
function createOutputPath(inputPath: string, inputDir: string, outputDir: string): string {
  const relativePath = relative(inputDir, inputPath);
  const outputPath = join(outputDir, relativePath);
  return outputPath.replace(/\.astro$/, '.html');
}

/**
 * Creates a processing context for a file
 * Pure function - just data transformation
 */
function createProcessingContext(
  inputPath: string,
  inputDir: string,
  outputDir: string
): FileProcessingContext {
  return {
    inputPath,
    inputDir,
    outputDir,
    relativePath: relative(inputDir, inputPath),
  } as const;
}

/**
 * Creates a diagnostic for build errors
 * Pure function - just data creation
 */
function createBuildErrorDiagnostic(error: unknown): Diagnostic {
  return {
    code: 'build-error',
    message: `Build error: ${error instanceof Error ? error.message : String(error)}`,
    loc: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    },
    severity: 'error',
  } as const;
}

/**
 * Formats diagnostic for console output
 * Pure function - just string formatting
 */
function formatDiagnostic(diagnostic: Diagnostic, filename: string): string {
  const { severity, code, message, loc } = diagnostic;
  const location = `${filename}:${loc.start.line}:${loc.start.column}`;
  const prefix = severity === 'error' ? '✗' : '⚠';
  return `${prefix} ${location} ${code}: ${message}`;
}

/**
 * Counts diagnostics by severity
 * Pure function - reduces array to counts
 */
function countDiagnostics(diagnostics: readonly Diagnostic[]): {
  errors: number;
  warnings: number;
} {
  return diagnostics.reduce(
    (counts, diagnostic) => ({
      errors: counts.errors + (diagnostic.severity === 'error' ? 1 : 0),
      warnings: counts.warnings + (diagnostic.severity === 'warning' ? 1 : 0),
    }),
    { errors: 0, warnings: 0 }
  );
}

/**
 * Aggregates multiple process results into a build summary
 * Pure function - reduces results to summary
 */
function aggregateResults(results: readonly ProcessResult[]): BuildSummary {
  const allDiagnostics = results.flatMap((result) => result.diagnostics);
  const { errors, warnings } = countDiagnostics(allDiagnostics);
  const successfulFiles = results.filter((result) => result.success).length;

  return {
    totalFiles: results.length,
    successfulFiles,
    errors,
    warnings,
    allDiagnostics,
    success: errors === 0,
  } as const;
}

/**
 * Creates a build result from summary
 * Pure function - data transformation
 */
function createBuildResult(summary: BuildSummary): BuildResult {
  return {
    success: summary.success,
    processedFiles: summary.successfulFiles,
    errors: summary.errors,
    warnings: summary.warnings,
    diagnostics: summary.allDiagnostics,
  } as const;
}

/**
 * Creates empty build result for when no files are found
 * Pure function - constant data
 */
function createEmptyBuildResult(): BuildResult {
  return {
    success: true,
    processedFiles: 0,
    errors: 0,
    warnings: 0,
    diagnostics: [],
  } as const;
}

// ============================================================================
// SIDE-EFFECT FUNCTIONS - I/O operations, logging
// ============================================================================

/**
 * Ensures a directory exists (side effect: file system modification)
 */
async function ensureDirectoryExists(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    throw new Error(`Failed to create directory: ${dir}`);
  }
}

/**
 * Validates that input directory exists (side effect: file system read)
 */
function validateInputDirectory(inputDir: string): void {
  if (!existsSync(inputDir)) {
    throw new Error(`Input directory does not exist: ${inputDir}`);
  }
}

/**
 * Processes a single file (side effects: file I/O)
 */
async function processFile(context: FileProcessingContext): Promise<ProcessResult> {
  const { inputPath, inputDir, outputDir } = context;

  try {
    // Read and parse
    const source = await readFile(inputPath, 'utf-8');
    const parseResult = parseAstro(source, { filename: inputPath });

    // Build HTML
    const html = buildHtml(parseResult.ast, { prettyPrint: true });

    // Prepare output
    const outputPath = createOutputPath(inputPath, inputDir, outputDir);
    const outputDirPath = dirname(outputPath);

    // Write file (side effects)
    await ensureDirectoryExists(outputDirPath);
    await writeFile(outputPath, html, 'utf-8');

    return {
      success: true,
      filePath: inputPath,
      outputPath,
      diagnostics: parseResult.diagnostics,
    } as const;
  } catch (error) {
    return {
      success: false,
      filePath: inputPath,
      outputPath: '',
      diagnostics: [createBuildErrorDiagnostic(error)],
    } as const;
  }
}

/**
 * Processes multiple files concurrently (side effects: file I/O)
 */
async function processFiles(
  contexts: readonly FileProcessingContext[],
  concurrency = 10
): Promise<readonly ProcessResult[]> {
  // Process files in chunks to control concurrency
  const chunks: (readonly FileProcessingContext[])[] = [];
  for (let i = 0; i < contexts.length; i += concurrency) {
    chunks.push(contexts.slice(i, i + concurrency));
  }

  const results: ProcessResult[] = [];

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(chunk.map((context) => processFile(context)));

    const successfulResults = chunkResults.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : ({
            success: false,
            filePath: '',
            outputPath: '',
            diagnostics: [createBuildErrorDiagnostic(result.reason)],
          } as const)
    );

    results.push(...successfulResults);
  }

  return results;
}

/**
 * Logs build progress (side effect: console output)
 */
function logBuildStart(inputDir: string, outputDir: string): void {
  console.log(`🚀 Building .astro files from "${inputDir}" to "${outputDir}"`);
}

/**
 * Logs file discovery (side effect: console output)
 */
function logFileDiscovery(fileCount: number): void {
  if (fileCount === 0) {
    console.log('📁 No .astro files found');
  } else {
    console.log(`📄 Found ${fileCount} .astro file${fileCount === 1 ? '' : 's'}`);
  }
}

/**
 * Logs processing progress (side effect: console output)
 */
function logFileProgress(context: FileProcessingContext): void {
  console.log(`🔨 Processing ${context.relativePath}...`);
}

/**
 * Logs diagnostics for a file (side effect: console output)
 */
function logFileDiagnostics(result: ProcessResult): void {
  for (const diagnostic of result.diagnostics) {
    const relativePath = relative(process.cwd(), result.filePath);
    console.log(formatDiagnostic(diagnostic, relativePath));
  }
}

/**
 * Logs build summary (side effect: console output)
 */
function logBuildSummary(summary: BuildSummary): void {
  console.log('\n📊 Build Summary:');
  console.log(`   Files processed: ${summary.successfulFiles}/${summary.totalFiles}`);
  console.log(`   Errors: ${summary.errors}`);
  console.log(`   Warnings: ${summary.warnings}`);

  if (summary.success) {
    console.log('✅ Build completed successfully!');
  } else {
    console.log('❌ Build completed with errors');
  }
}

// ============================================================================
// MAIN BUILD FUNCTION - Orchestrates pure functions and side effects
// ============================================================================

import { rm } from 'node:fs/promises';

/**
 * Cleans the output directory before a build
 */
async function cleanOutputDir(outputDir: string): Promise<void> {
  try {
    await rm(outputDir, { recursive: true, force: true });
  } catch (error) {
    // It's okay if the directory doesn't exist
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to clean output directory: ${outputDir}`);
    }
  }
}

/**
 * Main build function - orchestrates the entire build process
 * Separates side effects from pure logic for better testability
 */
export async function build(options: BuildOptions): Promise<BuildResult> {
  const { inputDir, outputDir, concurrency = 10 } = options;

  // Side effect: logging
  logBuildStart(inputDir, outputDir);

  // Side effect: clean output directory
  await cleanOutputDir(outputDir);

  // Side effect: validation
  validateInputDirectory(inputDir);

  // Side effect: file discovery
  const astroFiles = await discoverAstroFiles(inputDir);

  // Side effect: logging
  logFileDiscovery(astroFiles.length);

  // Early return for empty case
  if (astroFiles.length === 0) {
    return createEmptyBuildResult();
  }

  // Pure: create processing contexts
  const contexts = astroFiles.map((filePath) =>
    createProcessingContext(filePath, inputDir, outputDir)
  );

  // Log progress for each file
  contexts.forEach(logFileProgress);

  // Side effect: process all files
  const results = await processFiles(contexts, concurrency);

  // Side effect: log diagnostics
  results.forEach(logFileDiagnostics);

  // Pure: aggregate results
  const summary = aggregateResults(results);

  // Side effect: log summary
  logBuildSummary(summary);

  // Pure: create final result
  return createBuildResult(summary);
}
