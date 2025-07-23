import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { discoverAstroFiles } from '../../../../src/cli/utils/file-discovery.js';

describe('File Discovery', () => {
  const testDir = join(process.cwd(), 'test-tmp-discovery');
  
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  describe('discoverAstroFiles', () => {
    it('should find .astro files in a directory', async () => {
      // Create test files
      await writeFile(join(testDir, 'index.astro'), '---\n---\n<h1>Test</h1>');
      await writeFile(join(testDir, 'about.astro'), '---\n---\n<h1>About</h1>');
      await writeFile(join(testDir, 'style.css'), 'body { margin: 0; }');
      
      const files = await discoverAstroFiles(testDir);
      
      expect(files).toHaveLength(2);
      expect(files).toContain(join(testDir, 'index.astro'));
      expect(files).toContain(join(testDir, 'about.astro'));
    });
    
    it('should find .astro files in nested directories', async () => {
      // Create nested structure
      await mkdir(join(testDir, 'blog'), { recursive: true });
      await mkdir(join(testDir, 'components'), { recursive: true });
      
      await writeFile(join(testDir, 'index.astro'), '---\n---\n<h1>Home</h1>');
      await writeFile(join(testDir, 'blog', 'post-1.astro'), '---\n---\n<h1>Post 1</h1>');
      await writeFile(join(testDir, 'blog', 'post-2.astro'), '---\n---\n<h1>Post 2</h1>');
      await writeFile(join(testDir, 'components', 'Header.astro'), '---\n---\n<header>Header</header>');
      
      const files = await discoverAstroFiles(testDir);
      
      expect(files).toHaveLength(4);
      expect(files).toContain(join(testDir, 'index.astro'));
      expect(files).toContain(join(testDir, 'blog', 'post-1.astro'));
      expect(files).toContain(join(testDir, 'blog', 'post-2.astro'));
      expect(files).toContain(join(testDir, 'components', 'Header.astro'));
    });
    
    it('should handle dynamic route files', async () => {
      await mkdir(join(testDir, 'blog'), { recursive: true });
      await writeFile(join(testDir, 'blog', '[slug].astro'), '---\n---\n<h1>Dynamic Route</h1>');
      await writeFile(join(testDir, 'blog', '[...slug].astro'), '---\n---\n<h1>Catch-all Route</h1>');
      
      const files = await discoverAstroFiles(testDir);
      
      expect(files).toHaveLength(2);
      expect(files).toContain(join(testDir, 'blog', '[slug].astro'));
      expect(files).toContain(join(testDir, 'blog', '[...slug].astro'));
    });
    
    it('should throw error for non-existent directory', async () => {
      await expect(discoverAstroFiles(join(testDir, 'non-existent'))).rejects.toThrow(
        'Failed to read directory'
      );
    });
    
    it('should handle empty directory', async () => {
      const files = await discoverAstroFiles(testDir);
      
      expect(files).toHaveLength(0);
    });
    
    it('should find files in all directories including node_modules', async () => {
      await mkdir(join(testDir, 'node_modules'), { recursive: true });
      await mkdir(join(testDir, '.hidden'), { recursive: true });
      
      await writeFile(join(testDir, 'index.astro'), '---\n---\n<h1>Index</h1>');
      await writeFile(join(testDir, 'node_modules', 'package.astro'), '---\n---\n<h1>In node_modules</h1>');
      await writeFile(join(testDir, '.hidden', 'secret.astro'), '---\n---\n<h1>In hidden dir</h1>');
      
      const files = await discoverAstroFiles(testDir);
      
      // Current implementation doesn't filter any directories
      expect(files).toHaveLength(3);
      expect(files).toContain(join(testDir, 'index.astro'));
      expect(files).toContain(join(testDir, 'node_modules', 'package.astro'));
      expect(files).toContain(join(testDir, '.hidden', 'secret.astro'));
    });
    
    it('should handle directories with special characters', async () => {
      const specialDir = join(testDir, 'special-chars_123');
      await mkdir(specialDir, { recursive: true });
      await writeFile(join(specialDir, 'page.astro'), '---\n---\n<h1>Special</h1>');
      
      const files = await discoverAstroFiles(testDir);
      
      expect(files).toHaveLength(1);
      expect(files).toContain(join(specialDir, 'page.astro'));
    });
  });
});