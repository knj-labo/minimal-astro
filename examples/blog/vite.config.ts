import astro from 'minimal-astro/vite-plugin-astro';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    astro({
      dev: true,
      prettyPrint: true,
      extensions: ['.astro'],
    }),
  ],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
