import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['packages/runtime/**', 'jsdom']],
    include: ['packages/**/test/unit/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'packages/**/dist/**',
        'packages/**/test/**',
        'examples/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@minimal-astro/compiler': resolve(__dirname, 'packages/compiler/src'),
      '@minimal-astro/content': resolve(__dirname, 'packages/content/src'),
      '@minimal-astro/internal-helpers': resolve(__dirname, 'packages/internal-helpers/src'),
      '@minimal-astro/renderer-react': resolve(__dirname, 'packages/renderer/react/src'),
      '@minimal-astro/renderer-svelte': resolve(__dirname, 'packages/renderer/svelte/src'),
      '@minimal-astro/renderer-vue': resolve(__dirname, 'packages/renderer/vue/src'),
      '@minimal-astro/runtime': resolve(__dirname, 'packages/runtime/src'),
      '@minimal-astro/types': resolve(__dirname, 'packages/types/src'),
      '@minimal-astro/vite-plugin': resolve(__dirname, 'packages/vite-plugin/src'),
    },
  },
});
