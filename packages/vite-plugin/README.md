# @minimal-astro/vite-plugin

Vite plugin for minimal-astro. Handles development server, HMR, and build integration.

## Installation

```bash
pnpm add @minimal-astro/vite-plugin
```

## Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { astroVitePlugin } from '@minimal-astro/vite-plugin';

export default defineConfig({
  plugins: [
    astroVitePlugin({
      dev: true,
      prettyPrint: true
    })
  ]
});
```

## Features

- Transform .astro files to JavaScript modules
- Hot Module Replacement (HMR) support
- Development server integration
- Build optimization
- CSS dependency tracking