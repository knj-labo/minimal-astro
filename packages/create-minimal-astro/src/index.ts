#!/usr/bin/env node

/**
 * create-minimal-astro
 * Project scaffolding tool for Minimal Astro
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

async function main() {
  const projectName = process.argv[2] || 'my-astro-project';
  const projectPath = join(process.cwd(), projectName);

  console.log(`Creating Minimal Astro project: ${projectName}`);

  // Create project directory
  mkdirSync(projectPath, { recursive: true });
  mkdirSync(join(projectPath, 'src/pages'), { recursive: true });
  mkdirSync(join(projectPath, 'src/components'), { recursive: true });
  mkdirSync(join(projectPath, 'public'), { recursive: true });

  // Create package.json
  const packageJson = {
    name: projectName,
    version: '0.0.1',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'minimal-astro build',
      preview: 'vite preview'
    },
    dependencies: {
      'minimal-astro': 'latest'
    },
    devDependencies: {
      'vite': '^5.0.0',
      'typescript': '^5.4.0'
    }
  };

  writeFileSync(
    join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite';
import astro from 'minimal-astro/vite-plugin-astro';

export default defineConfig({
  plugins: [astro()]
});`;

  writeFileSync(join(projectPath, 'vite.config.ts'), viteConfig);

  // Create index page
  const indexPage = `---
const title = "Welcome to Minimal Astro";
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
  </head>
  <body>
    <h1>{title}</h1>
    <p>Your Minimal Astro site is ready!</p>
  </body>
</html>`;

  writeFileSync(join(projectPath, 'src/pages/index.astro'), indexPage);

  console.log(`✅ Project created successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${projectName}`);
  console.log(`  npm install`);
  console.log(`  npm run dev`);
}

if (import.meta.url === \`file://\${process.argv[1]}\`) {
  main().catch(console.error);
}