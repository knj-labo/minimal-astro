import { defineConfig } from 'minimal-astro';
import react from '@minimal-astro/react';
import vue from '@minimal-astro/vue';
import svelte from '@minimal-astro/svelte';

export default defineConfig({
  integrations: [
    react(),
    vue(),
    svelte()
  ],
  output: 'static'
});