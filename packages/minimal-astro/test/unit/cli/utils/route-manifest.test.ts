import { describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { generateRouteManifest } from '../../../../src/cli/utils/route-manifest.js';

describe('Route Manifest Generation', () => {
  const mockRoot = '/project/root';
  const pagesDir = join(mockRoot, 'src', 'pages');
  
  describe('generateRouteManifest', () => {
    it('should generate routes for basic pages', async () => {
      const pages = [
        join(pagesDir, 'index.astro'),
        join(pagesDir, 'about.astro'),
        join(pagesDir, 'contact.astro'),
      ];
      
      const manifest = await generateRouteManifest(pages, mockRoot);
      
      expect(manifest.routes).toHaveLength(3);
      expect(manifest.routes[0]).toMatchObject({
        component: join(pagesDir, 'index.astro'),
        pathname: '/',
        pattern: '/',
        params: [],
      });
      expect(manifest.routes[1]).toMatchObject({
        component: join(pagesDir, 'about.astro'),
        pathname: '/about',
        pattern: '/about',
        params: [],
      });
      expect(manifest.routes[2]).toMatchObject({
        component: join(pagesDir, 'contact.astro'),
        pathname: '/contact',
        pattern: '/contact',
        params: [],
      });
    });
    
    it('should handle nested routes', async () => {
      const pages = [
        join(pagesDir, 'blog', 'index.astro'),
        join(pagesDir, 'blog', 'post-1.astro'),
        join(pagesDir, 'products', 'category', 'item.astro'),
      ];
      
      const manifest = await generateRouteManifest(pages, mockRoot);
      
      expect(manifest.routes).toHaveLength(3);
      expect(manifest.routes[0]).toMatchObject({
        pathname: '/blog',
        pattern: '/blog',
        component: join(pagesDir, 'blog', 'index.astro'),
      });
      expect(manifest.routes[1]).toMatchObject({
        pathname: '/blog/post-1',
        pattern: '/blog/post-1',
        component: join(pagesDir, 'blog', 'post-1.astro'),
      });
      expect(manifest.routes[2]).toMatchObject({
        pathname: '/products/category/item',
        pattern: '/products/category/item',
        component: join(pagesDir, 'products', 'category', 'item.astro'),
      });
    });
    
    it('should handle dynamic routes', async () => {
      const pages = [
        join(pagesDir, 'blog', '[slug].astro'),
        join(pagesDir, 'users', '[id].astro'),
      ];
      
      const manifest = await generateRouteManifest(pages, mockRoot);
      
      expect(manifest.routes).toHaveLength(2);
      expect(manifest.routes[0]).toMatchObject({
        pattern: '/blog/:slug',
        params: ['slug'],
        component: join(pagesDir, 'blog', '[slug].astro'),
      });
      expect(manifest.routes[0].pattern.test('/blog/my-post')).toBe(true);
      expect(manifest.routes[0].pattern.test('/blog/another-post')).toBe(true);
      expect(manifest.routes[0].pattern.test('/blog/')).toBe(false);
      
      expect(manifest.routes[1]).toMatchObject({
        pattern: '/users/:id',
        params: ['id'],
        component: join(pagesDir, 'users', '[id].astro'),
      });
    });
    
    it('should handle catch-all routes', async () => {
      const pages = [
        join(pagesDir, 'docs', '[...slug].astro'),
        join(pagesDir, 'api', '[...path].astro'),
      ];
      
      const manifest = await generateRouteManifest(pages, mockRoot);
      
      expect(manifest.routes).toHaveLength(2);
      expect(manifest.routes[0]).toMatchObject({
        pattern: '/docs/:...slug',
        params: [],
        component: join(pagesDir, 'docs', '[...slug].astro'),
      });
      expect(manifest.routes[0].pattern.test('/docs/guide')).toBe(true);
      expect(manifest.routes[0].pattern.test('/docs/guide/intro')).toBe(true);
      expect(manifest.routes[0].pattern.test('/docs/guide/intro/start')).toBe(true);
      expect(manifest.routes[0].pattern.test('/docs')).toBe(true);
    });
    
    it('should handle API routes', async () => {
      const pages = [
        join(pagesDir, 'api', 'posts.json.ts'),
        join(pagesDir, 'api', 'users', '[id].json.ts'),
      ];
      
      const manifest = await generateRouteManifest(pages, mockRoot);
      
      expect(manifest.routes).toHaveLength(2);
      expect(manifest.routes[0]).toMatchObject({
        pathname: '/api/posts.json.ts',
        pattern: '/api/posts.json.ts',
        component: join(pagesDir, 'api', 'posts.json.ts'),
      });
      expect(manifest.routes[1]).toMatchObject({
        pattern: '/api/users/:id.json.ts',
        params: ['id'],
        component: join(pagesDir, 'api', 'users', '[id].json.ts'),
      });
    });
    
    it('should sort routes by specificity', async () => {
      const pages = [
        join(pagesDir, '[...slug].astro'),
        join(pagesDir, 'about.astro'),
        join(pagesDir, '[page].astro'),
        join(pagesDir, 'index.astro'),
      ];
      
      const manifest = await generateRouteManifest(pages, mockRoot);
      
      // More specific routes should come first
      expect(manifest.routes[0].pathname).toBe('/');
      expect(manifest.routes[1].pathname).toBe('/about');
      expect(manifest.routes[2].pathname).toBe(undefined); // dynamic route
      expect(manifest.routes[3].pathname).toBe(undefined); // catch-all route
    });
    
    it('should handle empty pages array', async () => {
      const manifest = await generateRouteManifest([], mockRoot);
      
      expect(manifest.routes).toHaveLength(0);
    });
    
    it('should normalize paths on Windows', async () => {
      const windowsRoot = 'C:\\project\\root';
      const windowsPagesDir = 'C:\\project\\root\\src\\pages';
      const pages = [
        windowsPagesDir + '\\index.astro',
        windowsPagesDir + '\\blog\\post.astro',
      ];
      
      const manifest = await generateRouteManifest(pages, windowsRoot);
      
      // Component paths should be absolute
      expect(manifest.routes).toHaveLength(2);
      expect(manifest.routes[0].component).toContain('index.astro');
      expect(manifest.routes[1].component).toContain('post.astro');
    });
  });
});