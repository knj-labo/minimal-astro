/**
 * Configuration utilities for minimal-astro
 */

export interface AstroConfig {
  integrations?: unknown[];
  output?: 'static' | 'server';
  build?: {
    inlineStylesheets?: 'auto' | 'always' | 'never';
  };
}

export function defineConfig(config: AstroConfig): AstroConfig {
  return config;
}
