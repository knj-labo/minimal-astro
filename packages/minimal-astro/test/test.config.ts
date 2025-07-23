import { defineConfig } from 'bun:test'

export default defineConfig({
  // Test timeout in milliseconds
  timeout: 30000,

  // Test patterns
  patterns: {
    unit: 'packages/minimal-astro/test/unit/**/*.test.ts',
    integration: 'packages/minimal-astro/test/fixtures/**/test.ts',
    e2e: 'packages/minimal-astro/test/e2e/**/*.test.ts',
  },

  // Coverage configuration
  coverage: {
    enabled: process.env.COVERAGE === 'true',
    reporter: ['text', 'json', 'html'],
    exclude: [
      '**/node_modules/**',
      '**/test/**',
      '**/*.test.ts',
      '**/fixtures/**',
    ],
    thresholds: {
      global: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },

  // Global setup/teardown
  setup: async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test'
  },

  teardown: async () => {
    // Clean up after all tests
  },

  // Reporter options
  reporter: process.env.CI ? 'github' : 'spec',

  // Bail on first test failure in CI
  bail: process.env.CI === 'true',
})