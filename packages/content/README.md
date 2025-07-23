# @minimal-astro/content

Content Collections implementation for minimal-astro. Provides type-safe content management with Zod schema validation.

## Features

- Type-safe content collections
- Zod schema validation
- Content loading utilities
- TypeScript type generation

## Installation

```bash
pnpm add @minimal-astro/content
```

## Usage

```typescript
import { defineCollection, defineConfig, z } from '@minimal-astro/content';

// Define a collection schema
const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()),
    draft: z.boolean().optional(),
  }),
});

// Define content config
export const collections = defineConfig({
  blog: blogCollection,
});

// Use in your code
import { getCollection, getEntry } from '@minimal-astro/content/api';

const posts = await getCollection('blog');
const post = await getEntry('blog', 'my-post');
```