# @minimal-astro/core

Core utilities for minimal-astro. Provides shared functionality used across packages.

## Components

- **Logger**: Contextual logging with levels
- **Error Boundary**: Safe error handling utilities

## Installation

```bash
pnpm add @minimal-astro/core
```

## Usage

```typescript
import { createContextualLogger } from '@minimal-astro/core/logger';
import { safeExecute } from '@minimal-astro/core/error-boundary';

// Create a logger with context
const logger = createContextualLogger({ component: 'MyComponent' });
logger.info('Component initialized');

// Execute code safely with error handling
const result = safeExecute(
  () => riskyOperation(),
  defaultValue,
  (error) => logger.error('Operation failed', error)
);
```