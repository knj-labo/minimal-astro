import { defineConfig } from 'bun:test';

export default defineConfig({
  // Test timeout in milliseconds
  timeout: 30000,

  // Test patterns
  patterns: {
    unit: 'packages/**/test/unit/**/*.test.ts',
    integration: 'tests/fixtures/**/test.ts',
    e2e: 'tests/e2e/**/*.test.ts',
  },

  // Coverage configuration
  coverage: {
    enabled: process.env.COVERAGE === 'true',
    reporter: ['text', 'json', 'html'],
    exclude: ['**/node_modules/**', '**/test/**', '**/*.test.ts', '**/fixtures/**', 'tests/**'],
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
    process.env.NODE_ENV = 'test';
  },

  teardown: async () => {
    // Clean up after all tests
  },

  // Reporter options
  reporter: process.env.CI ? 'github' : 'spec',

  // Bail on first test failure in CI
  bail: process.env.CI === 'true',
});
