import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

/**
 * Recursively discovers all .astro files in a directory
 * Pure function - only reads, doesn't modify anything
 */
export async function discoverAstroFiles(dir: string): Promise<readonly string[]> {
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
