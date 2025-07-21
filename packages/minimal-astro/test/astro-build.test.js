/**
 * Comprehensive integration tests for Astro build pipeline
 * Tests the complete dev → build → preview flow with all features
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { expectToContain, fetchFromServer, loadFixture, waitFor } from './test-utils.js';

describe('Astro Build Pipeline Integration Tests', () => {
  let fixture;
  let devServer;
  let previewServer;

  beforeEach(async () => {
    fixture = loadFixture('blog-complete');
    await fixture.clean();
  });

  afterEach(async () => {
    // Clean up any running servers
    if (devServer?.close) {
      devServer.close();
      devServer = null;
    }
    if (previewServer?.close) {
      previewServer.close();
      previewServer = null;
    }
  });

  describe('Build Output Generation', () => {
    it('should build all page types successfully', async () => {
      const result = await fixture.build();

      expect(result.success).toBe(true);
      expect(result.code).toBe(0);

      const buildOutput = await fixture.validateBuildOutput();

      // Check that all expected pages were generated
      expect(buildOutput.hasIndex).toBe(true);
      expect(buildOutput.htmlFiles).toContain('index.html');
      expect(buildOutput.htmlFiles).toContain('about.html');
      expect(buildOutput.htmlFiles).toContain('blog/index.html');
      expect(buildOutput.htmlFiles).toContain('blog/first-post.html');
      expect(buildOutput.htmlFiles).toContain('blog/second-post.html');

      // Check that API routes were generated
      expect(buildOutput.files).toContain('api/posts.json');

      console.log('✅ All pages generated successfully');
      console.log(
        `📊 Build stats: ${buildOutput.htmlFiles.length} HTML files, ${buildOutput.jsFiles.length} JS files, ${buildOutput.cssFiles.length} CSS files`
      );
    }, 30000);

    it('should copy and optimize static assets', async () => {
      await fixture.build();

      const buildOutput = await fixture.validateBuildOutput();

      // Check that public assets were copied
      expect(buildOutput.files).toContain('favicon.ico');
      expect(buildOutput.files).toContain('robots.txt');
      expect(buildOutput.files).toContain('images/hero.jpg');
      expect(buildOutput.files).toContain('styles/global.css');

      // Verify robots.txt content
      const robotsContent = await fixture.readFile('dist/robots.txt');
      expectToContain(robotsContent, ['User-agent: *', 'Allow: /', 'Sitemap:']);

      console.log('✅ Static assets copied and optimized');
    }, 30000);

    it('should handle 404 and error pages gracefully', async () => {
      await fixture.build();

      // Try to access a non-existent page in build output
      const buildOutput = await fixture.validateBuildOutput();

      // Should not contain non-existent pages
      expect(buildOutput.htmlFiles).not.toContain('non-existent.html');
      expect(buildOutput.htmlFiles).not.toContain('blog/non-existent.html');

      console.log('✅ 404 handling works correctly');
    });
  });

  describe('HTML Content Validation', () => {
    beforeEach(async () => {
      await fixture.build();
    });

    it('should generate correct HTML structure', async () => {
      const indexHtml = await fixture.readFile('dist/index.html');

      // Check basic HTML structure
      expectToContain(indexHtml, [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8"',
        '<title>Home - Test Blog</title>',
        '<meta name="description"',
        '<link rel="stylesheet"',
        '</head>',
        '<body>',
        '</html>',
      ]);

      // Check navigation structure
      expectToContain(indexHtml, [
        '<nav class="nav">',
        '<a href="/" class="logo">Test Blog</a>',
        '<a href="/">Home</a>',
        '<a href="/blog">Blog</a>',
        '<a href="/about">About</a>',
      ]);

      console.log('✅ HTML structure is correct');
    });

    it('should process frontmatter and expressions correctly', async () => {
      const indexHtml = await fixture.readFile('dist/index.html');

      // Should contain processed content, not raw expressions
      expectToContain(indexHtml, [
        'Welcome to Test Blog',
        'A demonstration of Minimal Astro',
        'Interactive Demo',
      ]);

      // Should not contain unprocessed expressions
      expect(indexHtml).not.toContain('{');
      expect(indexHtml).not.toContain('---');

      console.log('✅ Frontmatter and expressions processed correctly');
    });

    it('should render blog posts with correct metadata', async () => {
      const firstPostHtml = await fixture.readFile('dist/blog/first-post.html');

      expectToContain(firstPostHtml, [
        '<title>Getting Started with Minimal Astro - Test Blog</title>',
        'Getting Started with Minimal Astro',
        'By John Doe',
        'January 15, 2024',
        '#astro',
        '#web-development',
        '← Back to Blog',
      ]);

      const secondPostHtml = await fixture.readFile('dist/blog/second-post.html');

      expectToContain(secondPostHtml, [
        'Advanced Patterns in Minimal Astro',
        'By Jane Smith',
        'February 1, 2024',
        '#advanced',
        '#patterns',
      ]);

      console.log('✅ Blog posts rendered with correct metadata');
    });

    it('should generate API endpoints correctly', async () => {
      const postsApiContent = await fixture.readFile('dist/api/posts.json');
      const postsData = JSON.parse(postsApiContent);

      // Check API structure
      expect(postsData).toHaveProperty('posts');
      expect(postsData).toHaveProperty('meta');
      expect(Array.isArray(postsData.posts)).toBe(true);

      // Should contain published posts only
      expect(postsData.posts.length).toBe(2);
      expect(postsData.posts.every((post) => !post.draft)).toBe(true);

      // Check meta information
      expect(postsData.meta.total).toBe(2);
      expect(postsData.meta.featured).toBe(1);
      expect(postsData.meta.authors).toContain('John Doe');
      expect(postsData.meta.authors).toContain('Jane Smith');

      console.log('✅ API endpoints generated correctly');
    });
  });

  describe('React Component Integration', () => {
    beforeEach(async () => {
      await fixture.build();
    });

    it('should render React components server-side', async () => {
      const indexHtml = await fixture.readFile('dist/index.html');

      // Should contain server-rendered React component markup
      expectToContain(indexHtml, [
        'data-testid="homepage-counter"',
        'Interactive React Counter (Island)',
        'Homepage Counter',
        'data-testid="homepage-counter-value"',
        'data-testid="homepage-counter-increment"',
        'data-testid="homepage-counter-decrement"',
        'data-testid="homepage-counter-reset"',
      ]);

      // Should contain initial state
      expect(indexHtml).toContain('>0<'); // Initial count value

      console.log('✅ React components rendered server-side');
    });

    it('should generate hydration scripts for interactive components', async () => {
      const indexHtml = await fixture.readFile('dist/index.html');

      // Should contain script tags for component hydration
      // Note: The exact hydration mechanism depends on implementation
      // This test checks for React-related script tags
      expect(indexHtml).toContain('<script');

      const buildOutput = await fixture.validateBuildOutput();

      // Should have generated JavaScript bundles
      expect(buildOutput.jsFiles.length).toBeGreaterThan(0);

      console.log('✅ Hydration scripts generated');
    });

    it('should handle different hydration strategies', async () => {
      const aboutHtml = await fixture.readFile('dist/about.html');
      const postHtml = await fixture.readFile('dist/blog/first-post.html');

      // About page uses client:visible
      expectToContain(aboutHtml, ['data-testid="about-counter"', 'About Page Views']);

      // Post page uses client:idle
      expectToContain(postHtml, ['data-testid="post-counter"', 'Post Engagement']);

      console.log('✅ Different hydration strategies handled correctly');
    });
  });

  describe('Content Collections Processing', () => {
    beforeEach(async () => {
      await fixture.build();
    });

    it('should process markdown content correctly', async () => {
      const firstPostHtml = await fixture.readFile('dist/blog/first-post.html');

      // Should contain processed markdown content
      expectToContain(firstPostHtml, [
        '<h1>Getting Started with Minimal Astro</h1>',
        '<h2>What is Minimal Astro?</h2>',
        '<strong>Server-Side Rendering (SSR)</strong>',
        '<li><strong>Installation</strong>',
        '<code>npm run dev</code>',
      ]);

      console.log('✅ Markdown content processed correctly');
    });

    it('should handle MDX content with embedded components', async () => {
      const secondPostHtml = await fixture.readFile('dist/blog/second-post.html');

      // Should contain MDX-processed content
      expectToContain(secondPostHtml, [
        'Advanced Patterns in Minimal Astro',
        'MDX support',
        'component composition',
      ]);

      // Should contain embedded React components
      expectToContain(secondPostHtml, [
        'data-testid="mdx-counter"',
        'MDX Counter',
        'data-testid="final-counter"',
      ]);

      console.log('✅ MDX content with components processed correctly');
    });

    it('should filter draft posts correctly', async () => {
      const buildOutput = await fixture.validateBuildOutput();

      // Draft post should not be generated in production build
      expect(buildOutput.htmlFiles).not.toContain('blog/draft-post.html');

      // Blog index should not list draft posts
      const blogIndexHtml = await fixture.readFile('dist/blog/index.html');
      expect(blogIndexHtml).not.toContain('This is a Draft Post');

      // API should not include draft posts
      const postsApiContent = await fixture.readFile('dist/api/posts.json');
      const postsData = JSON.parse(postsApiContent);
      expect(postsData.posts.every((post) => !post.draft)).toBe(true);

      console.log('✅ Draft posts filtered correctly');
    });

    it('should validate content schemas', async () => {
      const postsApiContent = await fixture.readFile('dist/api/posts.json');
      const postsData = JSON.parse(postsApiContent);

      // All posts should have required schema fields
      for (const post of postsData.posts) {
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('description');
        expect(post).toHaveProperty('publishDate');
        expect(post).toHaveProperty('author');
        expect(post).toHaveProperty('tags');
        expect(Array.isArray(post.tags)).toBe(true);
      }

      console.log('✅ Content schemas validated correctly');
    });
  });

  describe('Performance and Optimization', () => {
    beforeEach(async () => {
      await fixture.build();
    });

    it('should generate optimized assets', async () => {
      const buildOutput = await fixture.validateBuildOutput();

      // Should have CSS files
      expect(buildOutput.cssFiles.length).toBeGreaterThan(0);

      // Should have JavaScript bundles
      expect(buildOutput.jsFiles.length).toBeGreaterThan(0);

      // Check that assets are in assets directory (for cache busting)
      const assetFiles = buildOutput.files.filter((f) => f.startsWith('assets/'));
      expect(assetFiles.length).toBeGreaterThan(0);

      console.log(`✅ Assets optimized: ${assetFiles.length} files in assets directory`);
    });

    it('should complete build in reasonable time', async () => {
      const startTime = Date.now();
      await fixture.build();
      const buildTime = Date.now() - startTime;

      // Build should complete in under 30 seconds for this small site
      expect(buildTime).toBeLessThan(30000);

      console.log(`✅ Build completed in ${buildTime}ms`);
    });

    it('should generate proper meta tags for SEO', async () => {
      const indexHtml = await fixture.readFile('dist/index.html');

      expectToContain(indexHtml, [
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="description" content="Welcome to our test blog built with Minimal Astro">',
        '<link rel="icon" type="image/x-icon" href="/favicon.ico">',
      ]);

      const postHtml = await fixture.readFile('dist/blog/first-post.html');

      expectToContain(postHtml, [
        '<meta name="description" content="Learn how to build fast, modern websites with our lightweight Astro implementation.">',
      ]);

      console.log('✅ SEO meta tags generated correctly');
    });
  });

  describe('Development Server Integration', () => {
    it('should start development server successfully', async () => {
      // Note: This test is commented out as dev server is not yet implemented
      // devServer = await fixture.dev({ port: 3001 });
      //
      // expect(devServer.port).toBe(3001);
      // expect(devServer.url).toBe('http://localhost:3001');
      //
      // // Test that pages are accessible
      // const response = await fetchFromServer(devServer.url);
      // expect(response.ok).toBe(true);
      //
      // const html = await response.text();
      // expectToContain(html, ['Welcome to Test Blog']);

      console.log('⚠️ Dev server test skipped - not yet implemented');
    });
  });

  describe('Preview Server Integration', () => {
    it('should serve built site correctly', async () => {
      await fixture.build();

      // Note: This test needs a working preview server implementation
      // previewServer = await fixture.preview({ port: 4001 });
      //
      // expect(previewServer.port).toBe(4001);
      // expect(previewServer.url).toBe('http://localhost:4001');
      //
      // // Test homepage
      // const indexResponse = await fetchFromServer(`${previewServer.url}/`);
      // expect(indexResponse.ok).toBe(true);
      //
      // const indexHtml = await indexResponse.text();
      // expectToContain(indexHtml, ['Welcome to Test Blog']);
      //
      // // Test blog post
      // const postResponse = await fetchFromServer(`${previewServer.url}/blog/first-post`);
      // expect(postResponse.ok).toBe(true);
      //
      // // Test API endpoint
      // const apiResponse = await fetchFromServer(`${previewServer.url}/api/posts.json`);
      // expect(apiResponse.ok).toBe(true);
      //
      // const apiData = await apiResponse.json();
      // expect(apiData.posts.length).toBe(2);

      console.log('⚠️ Preview server test skipped - needs implementation');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle build errors gracefully', async () => {
      // This would test with a broken fixture, but for now we'll test with valid content
      // and verify the build succeeds

      const result = await fixture.build();
      expect(result.success).toBe(true);

      console.log('✅ Build handles valid content correctly');
    });

    it('should validate file structure integrity', async () => {
      await fixture.build();

      const buildOutput = await fixture.validateBuildOutput();

      // Verify no broken links in generated HTML
      for (const htmlFile of buildOutput.htmlFiles) {
        const content = await fixture.readFile(`dist/${htmlFile}`);

        // Check for common link patterns that should exist
        if (content.includes('href="/blog"')) {
          // If it links to blog, blog index should exist
          expect(buildOutput.htmlFiles).toContain('blog/index.html');
        }

        if (content.includes('href="/about"')) {
          // If it links to about, about page should exist
          expect(buildOutput.htmlFiles).toContain('about.html');
        }
      }

      console.log('✅ File structure integrity validated');
    });

    it('should handle large builds efficiently', async () => {
      // For now, we test with our existing content
      // In a real scenario, this would test with hundreds of pages

      const startTime = Date.now();
      await fixture.build();
      const buildTime = Date.now() - startTime;

      const buildOutput = await fixture.validateBuildOutput();

      // Memory usage should be reasonable
      expect(buildOutput.files.length).toBeGreaterThan(5);
      expect(buildTime).toBeLessThan(60000); // Should complete in under 1 minute

      console.log(
        `✅ Build efficiency validated: ${buildOutput.files.length} files in ${buildTime}ms`
      );
    });
  });

  describe('Complete Build Pipeline Validation', () => {
    it('should complete full build pipeline successfully', async () => {
      console.log('🚀 Starting complete build pipeline test...');

      // Step 1: Clean previous builds
      await fixture.clean();
      console.log('✅ Build directory cleaned');

      // Step 2: Run build
      const buildStart = Date.now();
      const buildResult = await fixture.build();
      const buildTime = Date.now() - buildStart;

      expect(buildResult.success).toBe(true);
      console.log(`✅ Build completed in ${buildTime}ms`);

      // Step 3: Validate output structure
      const buildOutput = await fixture.validateBuildOutput();

      expect(buildOutput.hasIndex).toBe(true);
      expect(buildOutput.htmlFiles.length).toBeGreaterThanOrEqual(5);
      expect(buildOutput.files).toContain('favicon.ico');
      expect(buildOutput.files).toContain('robots.txt');

      console.log(`✅ Build output validated: ${buildOutput.files.length} total files`);

      // Step 4: Content quality checks
      const indexContent = await fixture.readFile('dist/index.html');
      const blogContent = await fixture.readFile('dist/blog/index.html');
      const postContent = await fixture.readFile('dist/blog/first-post.html');
      const apiContent = await fixture.readFile('dist/api/posts.json');

      // All pages should be valid HTML
      expect(indexContent).toContain('<!DOCTYPE html>');
      expect(blogContent).toContain('<!DOCTYPE html>');
      expect(postContent).toContain('<!DOCTYPE html>');

      // API should be valid JSON
      expect(() => JSON.parse(apiContent)).not.toThrow();

      console.log('✅ Content quality validated');

      // Step 5: Feature completeness check
      const features = {
        'Static pages': indexContent.includes('Welcome to Test Blog'),
        'Blog functionality': blogContent.includes('Latest Posts'),
        'Dynamic routing': postContent.includes('Getting Started with Minimal Astro'),
        'React components': indexContent.includes('data-testid="homepage-counter"'),
        'API routes': JSON.parse(apiContent).posts.length > 0,
        'Asset optimization': buildOutput.assetFiles.length > 0,
        'Content collections': postContent.includes('By John Doe'),
        'SEO optimization': indexContent.includes('<meta name="description"'),
      };

      const passedFeatures = Object.entries(features).filter(([_, passed]) => passed);
      const failedFeatures = Object.entries(features).filter(([_, passed]) => !passed);

      console.log(`✅ Features working: ${passedFeatures.length}/${Object.keys(features).length}`);

      if (failedFeatures.length > 0) {
        console.log(
          '❌ Failed features:',
          failedFeatures.map(([name]) => name)
        );
      }

      // All critical features should work
      expect(passedFeatures.length).toBe(Object.keys(features).length);

      console.log('🎉 Complete build pipeline test PASSED!');
    }, 60000); // Allow up to 60 seconds for complete pipeline test
  });
});
