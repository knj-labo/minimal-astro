# Testing Guide for minimal-astro

This directory contains all tests for the minimal-astro package, organized following a three-layer test model.

## Test Structure

```
test/
├── unit/              # Pure logic tests in isolation
│   ├── cli/          # CLI command tests
│   ├── runtime/      # Runtime utilities tests
│   ├── vite-plugin/  # Vite plugin tests
│   └── content/      # Content Collections tests
├── fixtures/         # Integration test fixtures
│   └── integration/  # Full integration scenarios
└── e2e/             # End-to-end tests (if needed)
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run only unit tests
pnpm test:unit

# Run only integration tests
pnpm test:integration

# Run tests with coverage
pnpm test:coverage
```

## Writing Tests

### Unit Tests

Unit tests focus on individual functions and modules in isolation:

```typescript
// test/unit/cli/dev.test.ts
import { test, expect } from 'bun:test'
import { validateDevOptions } from '../../../src/cli/dev'

test('validateDevOptions throws on invalid port', () => {
  expect(() => validateDevOptions({ port: -1 })).toThrow()
})
```

### Integration Tests

Integration tests verify multiple components working together:

```typescript
// test/fixtures/integration/blog-complete/test.ts
import { test, expect } from 'bun:test'
import { buildFixture, loadFixture } from '../../test-utils'

test('blog renders markdown content', async () => {
  const fixture = await loadFixture('./fixtures/integration/blog-complete')
  const result = await buildFixture(fixture)
  
  expect(result.pages['/'].html).toContain('<h1>Welcome to my blog</h1>')
})
```

### Test Utilities

Common test utilities are available in `test-utils.ts`:

- `loadFixture(path)` - Load a fixture directory
- `buildFixture(fixture)` - Build a fixture and return results
- `createTestFile(path, content)` - Create temporary test files
- `cleanupTestFiles()` - Clean up temporary files

## Fixtures

Fixtures are complete minimal-astro projects used for integration testing:

```
fixtures/integration/blog-complete/
├── src/
│   ├── pages/
│   │   └── index.astro
│   └── content/
│       └── blog/
├── astro.config.js
└── test.ts          # Test file for this fixture
```

## Coverage

Test coverage reports are generated when running `pnpm test:coverage`:

- HTML report: `coverage/index.html`
- Console summary shows coverage percentages
- Minimum thresholds: 80% statements, 70% branches

## Best Practices

1. **Name tests clearly** - Describe what the test verifies
2. **Keep tests focused** - Test one thing at a time
3. **Use fixtures** - For integration tests, create minimal fixtures
4. **Mock external dependencies** - Don't make network calls in tests
5. **Clean up** - Always clean up temporary files and resources

## Debugging Tests

To debug a specific test:

```bash
# Run a single test file
bun test test/unit/cli/dev.test.ts

# Run tests matching a pattern
bun test -t "validates options"

# Enable verbose output
DEBUG=* bun test
```

## Adding New Tests

When adding new features:

1. Start with unit tests for core logic
2. Add integration tests for feature workflows
3. Update fixtures if testing new file types
4. Ensure all tests pass before committing

## CI Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Before releases

The CI pipeline runs tests with coverage and fails if thresholds aren't met.