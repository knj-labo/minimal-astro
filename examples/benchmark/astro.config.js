import react from '@minimal-astro/renderer-react';
import svelte from '@minimal-astro/renderer-svelte';
import vue from '@minimal-astro/renderer-vue';
import { defineConfig } from 'minimal-astro/config';

export default defineConfig({
  integrations: [react(), vue(), svelte()],
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
});
