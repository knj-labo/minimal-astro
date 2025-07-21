#!/usr/bin/env node

/**
 * Minimal Astro CLI
 * Command line interface for the framework
 */

export { build } from './build-vite.js';
export { build as buildSimple } from './build.js';

// Simple CLI implementation
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'build': {
      const { build } = await import('./build-vite.js');
      await build({
        root: process.cwd(),
        outDir: './dist',
      });
      break;
    }
    case 'build-simple': {
      const { build } = await import('./build.js');
      await build({
        inputDir: './src',
        outputDir: './dist',
      });
      break;
    }
    case 'dev': {
      console.log('🚧 Dev server coming soon...');
      break;
    }
    default:
      console.log('Usage: minimal-astro <command>');
      console.log('Commands:');
      console.log('  build        Build your Astro site with Vite');
      console.log('  build-simple Build .astro files only (legacy)');
      console.log('  dev          Start development server');
      break;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
