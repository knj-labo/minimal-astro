# Minimal Astro Benchmark Example

This example is used to benchmark the performance of minimal-astro using Lighthouse CI.

## Features

- Multi-framework components (React, Vue, Svelte)
- Different hydration strategies (load, idle, visible)
- Static and interactive content mix
- Performance monitoring with Lighthouse CI

## Running the benchmark

```bash
# Install dependencies
pnpm install

# Build the site
pnpm build

# Run Lighthouse CI
pnpm benchmark
```

## Performance Targets

- **Performance Score**: > 90
- **LCP (Largest Contentful Paint)**: < 2.5s
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TBT (Total Blocking Time)**: < 300ms

## Metrics Tracked

- Core Web Vitals (LCP, CLS, TBT)
- Resource optimization
- Accessibility
- Best practices
- SEO