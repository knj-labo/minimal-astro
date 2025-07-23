import { defineConfig } from 'minimal-astro/config';
import react from '@minimal-astro/renderer-react';
import vue from '@minimal-astro/renderer-vue';
import svelte from '@minimal-astro/renderer-svelte';

export default defineConfig({
  integrations: [react(), vue(), svelte()],
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
});