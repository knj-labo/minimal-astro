import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { astroVitePlugin } from '../vite-plugin-astro/plugin.js';

export interface DevOptions {
  root: string;
}

export async function dev(options: DevOptions) {
  const { root } = options;
  
  console.log('🚀 Starting Minimal Astro dev server...');
  
  // Create Vite server with our Astro plugin
  const server = await createServer({
    root,
    appType: 'custom', // Custom mode - no default HTML handling middlewares
    plugins: [
      astroVitePlugin({
        dev: true,
      }),
      // Add Vue plugin to handle .vue imports
      vue(),
    ],
    server: {
      port: 3000,
      open: true,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'vue', 'svelte'],
      exclude: ['*.astro'], // Don't optimize .astro files
    },
  });
  
  await server.listen();
  
  console.log(`
  🎉 Server running at http://localhost:${server.config.server.port}/
  
  Press Ctrl+C to stop
  `);
}