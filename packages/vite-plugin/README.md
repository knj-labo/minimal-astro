# @minimal-astro/vite-plugin

Vite plugin for transforming `.astro` files in the minimal-astro project.

## Current Status

This is a **stub implementation** that provides basic transformation of `.astro` files to JavaScript modules. The current implementation:

- ✅ Parses `.astro` files using `@minimal-astro/compiler`
- ✅ Builds HTML from the AST
- ✅ Exports the HTML as a default export
- ⚠️ Does not handle component imports/exports
- ⚠️ Does not support client-side hydration
- ⚠️ Does not extract CSS
- ⚠️ Does not provide proper HMR support (uses full reload)

## Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { vitePluginAstro } from '@minimal-astro/vite-plugin'

export default defineConfig({
  plugins: [vitePluginAstro()]
})
```

## Development

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm dev
```

## Future Enhancements

1. **Component Support**: Handle imports and exports in frontmatter
2. **Hydration**: Implement client-side hydration strategies
3. **CSS Extraction**: Extract and process styles from components
4. **HMR**: Implement proper Hot Module Replacement
5. **Source Maps**: Generate source maps for debugging
6. **Error Handling**: Better error messages and recovery