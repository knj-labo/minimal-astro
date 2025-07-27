/**
 * Client-side hydration module for minimal-astro
 * This module is loaded as a separate chunk to enable caching and reduce page size
 */

type HydrationDirective = 'load' | 'idle' | 'visible' | 'media' | 'only';

// Global flag for development mode
declare global {
  interface Window {
    __ASTRO_DEV__?: boolean;
    __ASTRO_COMPONENT_MODULES__?: Record<string, any>;
    __ASTRO_COMPONENT_TYPES__?: Record<string, string>;
    __ASTRO_COMPONENT_PATHS__?: Record<string, string>;
  }
}

interface HydrationOptions {
  componentModules?: Record<string, any>;
  componentTypes?: Record<string, string>;
  componentPaths?: Record<string, string>;
  dev?: boolean;
}

/**
 * Initialize the hydration system
 */
export function initHydration(options: HydrationOptions = {}) {
  if (typeof window === 'undefined') return;

  // Set development mode flag
  if (options.dev) {
    window.__ASTRO_DEV__ = true;
  }

  // Store component metadata globally
  window.__ASTRO_COMPONENT_MODULES__ = options.componentModules || {};
  window.__ASTRO_COMPONENT_TYPES__ = options.componentTypes || {};
  window.__ASTRO_COMPONENT_PATHS__ = options.componentPaths || {};

  // Set up hydration strategies
  setupHydrationStrategies();
}

/**
 * Hydrate a single component island
 */
export async function hydrateComponent(island: HTMLElement) {
  const componentName = island.getAttribute('component-export');
  const propsStr = island.getAttribute('component-props');
  const directive = island.getAttribute('client-directive') as HydrationDirective;

  if (!componentName || !directive) return;

  if (window.__ASTRO_DEV__) {
    console.debug(
      '[minimal-astro] Hydrating component:',
      componentName,
      'with directive:',
      directive
    );
  }

  let props = {};
  try {
    props = propsStr ? JSON.parse(propsStr) : {};
  } catch (e) {
    console.error('[minimal-astro] Failed to parse props:', e);
  }

  const Component = window.__ASTRO_COMPONENT_MODULES__?.[componentName];
  if (!Component) {
    console.error('[minimal-astro] Component not loaded:', componentName);
    return;
  }

  const type = window.__ASTRO_COMPONENT_TYPES__?.[componentName];
  if (window.__ASTRO_DEV__) {
    console.debug('[minimal-astro] Component type:', type);
  }

  try {
    await hydrateByType(island, Component, props, type);
  } catch (e) {
    console.error('[minimal-astro] Failed to hydrate component:', componentName, e);
  }
}

/**
 * Hydrate component based on its framework type
 */
async function hydrateByType(island: HTMLElement, Component: any, props: any, type?: string) {
  switch (type) {
    case 'react':
      await hydrateReact(island, Component, props);
      break;
    case 'vue':
      await hydrateVue(island, Component, props);
      break;
    case 'svelte':
      await hydrateSvelte(island, Component, props);
      break;
    default:
      console.warn('[minimal-astro] Unknown component type:', type);
  }
}

/**
 * Hydrate React component
 */
async function hydrateReact(island: HTMLElement, Component: any, props: any) {
  if (window.__ASTRO_DEV__) {
    console.debug('[minimal-astro] Hydrating React component...');
  }

  const React = await import('react');
  const ReactDOM = await import('react-dom/client');

  if (window.__ASTRO_DEV__) {
    console.debug('[minimal-astro] React loaded:', React);
    console.debug('[minimal-astro] ReactDOM loaded:', ReactDOM);
  }

  const root = ReactDOM.createRoot(island);
  const ReactComponent = Component.default || Component;

  if (window.__ASTRO_DEV__) {
    console.debug(
      '[minimal-astro] Creating element with component:',
      ReactComponent,
      'props:',
      props
    );
  }

  root.render(React.createElement(ReactComponent, props));
}

/**
 * Hydrate Vue component
 */
async function hydrateVue(island: HTMLElement, Component: any, props: any) {
  const { createApp } = await import('vue');
  const directive = island.getAttribute('client-directive');

  if (directive === 'only') {
    island.innerHTML = '';
  }

  const app = createApp(Component.default || Component, props);
  app.mount(island);
}

/**
 * Hydrate Svelte component
 */
async function hydrateSvelte(island: HTMLElement, Component: any, props: any) {
  const directive = island.getAttribute('client-directive');

  if (directive === 'only') {
    island.innerHTML = '';
  }

  new (Component.default || Component)({
    target: island,
    props,
    hydrate: directive !== 'only',
  });
}

/**
 * Set up hydration strategies
 */
function setupHydrationStrategies() {
  const componentPaths = window.__ASTRO_COMPONENT_PATHS__ || {};
  const componentTypes = window.__ASTRO_COMPONENT_TYPES__ || {};
  const componentModules = window.__ASTRO_COMPONENT_MODULES__ || {};

  if (window.__ASTRO_DEV__) {
    console.debug('[minimal-astro] Setting up hydration with paths:', componentPaths);
  }

  // Load components first
  loadComponents(componentPaths, componentTypes, componentModules).then(() => {
    if (window.__ASTRO_DEV__) {
      console.debug('[minimal-astro] All components loaded:', componentModules);
    }

    // Set up different hydration strategies
    setupLoadStrategy();
    setupIdleStrategy();
    setupVisibleStrategy();
    setupMediaStrategy();
  });
}

/**
 * Load all components
 */
async function loadComponents(
  paths: Record<string, string>,
  types: Record<string, string>,
  modules: Record<string, any>
) {
  const imports = [];

  for (const [name, path] of Object.entries(paths)) {
    if (types[name] && types[name] !== 'astro') {
      if (window.__ASTRO_DEV__) {
        console.debug('[minimal-astro] Loading component:', name, 'from:', path);
      }

      imports.push(
        import(/* @vite-ignore */ path)
          .then((m) => {
            modules[name] = m;
            if (window.__ASTRO_DEV__) {
              console.debug('[minimal-astro] Loaded component:', name, m);
            }
            return m;
          })
          .catch((e) => {
            console.error('[minimal-astro] Failed to load component:', name, 'from path:', path, e);
          })
      );
    }
  }

  await Promise.all(imports);
}

/**
 * Set up client:load strategy
 */
function setupLoadStrategy() {
  const islands = document.querySelectorAll('astro-island[client-directive="load"]');
  islands.forEach((island) => hydrateComponent(island as HTMLElement));
}

/**
 * Set up client:idle strategy
 */
function setupIdleStrategy() {
  const islands = document.querySelectorAll('astro-island[client-directive="idle"]');
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      islands.forEach((island) => hydrateComponent(island as HTMLElement));
    });
  } else {
    setTimeout(() => {
      islands.forEach((island) => hydrateComponent(island as HTMLElement));
    }, 200);
  }
}

/**
 * Set up client:visible strategy
 */
function setupVisibleStrategy() {
  const islands = document.querySelectorAll('astro-island[client-directive="visible"]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          hydrateComponent(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      });
    });
    islands.forEach((island) => observer.observe(island));
  } else {
    islands.forEach((island) => hydrateComponent(island as HTMLElement));
  }
}

/**
 * Set up client:media strategy
 */
function setupMediaStrategy() {
  const islands = document.querySelectorAll('astro-island[client-directive="media"]');
  islands.forEach((island) => {
    const mediaQuery = island.getAttribute('client-media');
    if (mediaQuery && window.matchMedia(mediaQuery).matches) {
      hydrateComponent(island as HTMLElement);
    }
  });
}

/**
 * Auto-initialize on DOM ready
 */
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  initHydration();
} else if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => initHydration());
}
