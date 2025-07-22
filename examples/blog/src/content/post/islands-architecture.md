---
title: "Understanding Islands Architecture"
description: "Deep dive into Islands Architecture and how it enables partial hydration in modern web applications"
date: 2024-01-20
author: "jp-knj"
tags: ["islands", "architecture", "performance", "hydration"]
---

# Understanding Islands Architecture

Islands Architecture is a pattern that delivers excellent performance by treating interactive components as isolated "islands" in a sea of static HTML.

## What is Islands Architecture?

Instead of hydrating an entire page (like traditional SPAs), Islands Architecture only hydrates the components that need interactivity. This results in:

- **Smaller JavaScript bundles**: Only interactive components ship JavaScript
- **Faster Time to Interactive (TTI)**: Less JavaScript to parse and execute
- **Better Core Web Vitals**: Improved LCP, FID, and CLS scores

## How It Works in Minimal Astro

Our implementation supports multiple hydration strategies:

### client:load
Hydrates the component as soon as the page loads:

```astro
<Counter client:load />
```

### client:idle
Hydrates when the browser is idle:

```astro
<Newsletter client:idle />
```

### client:visible
Hydrates when the component enters the viewport:

```astro
<Comments client:visible />
```

### client:only
Skips server-side rendering entirely:

```astro
<ThemeToggle client:only="vue" />
```

## Multi-Framework Islands

One of the most powerful features is mixing frameworks. This blog post page demonstrates all three frameworks working together:

- React Counter (for state management)
- Vue Theme Toggle (for reactive UI)
- Svelte Share Button (for lightweight interactions)

Each framework is only loaded where needed, keeping the overall bundle size minimal.

## Performance Benefits

By using Islands Architecture, this blog achieves:
- 100 Lighthouse Performance score
- Sub-second First Contentful Paint
- Minimal JavaScript payload

Try viewing the page source - you'll see most content is static HTML!