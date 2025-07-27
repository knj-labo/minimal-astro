# @minimal-astro/internal-helpers

Shared utilities and test helpers for the minimal-astro project.

## Installation

This package is internal to the minimal-astro monorepo and is automatically available to other packages.

## Usage

### Test Utilities

The `createFixture` function provides a convenient way to create temporary directories for testing:

```typescript
import { createFixture } from '@minimal-astro/internal-helpers/test-utils'

describe('my test', () => {
  it('should work with fixtures', async () => {
    // Create a temporary directory
    const fixture = await createFixture()
    
    // Write files to the fixture
    await fixture.writeFile('index.html', '<h1>Hello</h1>')
    await fixture.writeFile('src/main.js', 'console.log("test")')
    
    // Use fixture.path to access the temporary directory
    console.log(fixture.path) // e.g., /tmp/minimal-astro-test-abc123
    
    // Always cleanup when done
    await fixture.cleanup()
  })
})
```

## API

### `createFixture(prefix?: string): Promise<Fixture>`

Creates a temporary directory for testing.

**Parameters:**
- `prefix` (optional): Custom prefix for the directory name. Defaults to `'minimal-astro-test-'`

**Returns:**
A `Fixture` object with:
- `path`: The absolute path to the temporary directory
- `cleanup()`: Async function to remove the directory and all its contents
- `writeFile(filePath, content)`: Async function to write a file within the fixture directory

## Best Practices

1. Always call `fixture.cleanup()` after your tests to avoid leaving temporary files
2. Use try/finally blocks or test hooks to ensure cleanup happens even if tests fail
3. Each test should create its own fixture for isolation