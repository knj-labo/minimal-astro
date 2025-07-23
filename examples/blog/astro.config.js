import react from '@minimal-astro/react';
import svelte from '@minimal-astro/svelte';
import vue from '@minimal-astro/vue';
import { defineConfig } from 'minimal-astro';

export default defineConfig({
  integrations: [react(), vue(), svelte()],
  output: 'static',
});
