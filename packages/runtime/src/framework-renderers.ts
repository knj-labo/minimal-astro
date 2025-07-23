/**
 * Framework-specific rendering functions
 * Handles React and Preact hydration
 */

import type { ComponentType } from './types.js';

/**
 * Render React component
 */
export function renderReactComponent(component: ComponentType, container: HTMLElement): void {
  // biome-ignore lint/suspicious/noExplicitAny: Global React access requires any
  const React = (window as { React?: any }).React;
  // biome-ignore lint/suspicious/noExplicitAny: Global ReactDOM access requires any
  const ReactDOM = (window as { ReactDOM?: any }).ReactDOM;

  if (!React || !ReactDOM) {
    throw new Error('React and ReactDOM must be available globally for React hydration');
  }

  ReactDOM.hydrate(React.createElement(component), container);
}

/**
 * Render Preact component
 */
export function renderPreactComponent(component: ComponentType, container: HTMLElement): void {
  // biome-ignore lint/suspicious/noExplicitAny: Global Preact access requires any
  const { h, hydrate } = (window as { preact?: any }).preact ?? {};

  if (!h || !hydrate) {
    throw new Error(
      'Preact h and hydrate functions must be available globally for Preact hydration'
    );
  }

  hydrate(h(component), container);
}

/**
 * Get default render function based on runtime
 */
export function createDefaultRenderer(
  runtime: 'react' | 'preact'
): (component: ComponentType, container: HTMLElement) => void {
  return (component: ComponentType, container: HTMLElement) => {
    if (runtime === 'react') {
      renderReactComponent(component, container);
    } else if (runtime === 'preact') {
      renderPreactComponent(component, container);
    } else {
      throw new Error(`Unknown runtime: ${runtime}`);
    }
  };
}

/**
 * Check if React is available
 */
export function isReactAvailable(): boolean {
  // biome-ignore lint/suspicious/noExplicitAny: Global React access
  const React = (window as { React?: any }).React;
  // biome-ignore lint/suspicious/noExplicitAny: Global ReactDOM access
  const ReactDOM = (window as { ReactDOM?: any }).ReactDOM;
  return Boolean(React && ReactDOM);
}

/**
 * Check if Preact is available
 */
export function isPreactAvailable(): boolean {
  // biome-ignore lint/suspicious/noExplicitAny: Global Preact access
  const { h, hydrate } = (window as { preact?: any }).preact ?? {};
  return Boolean(h && hydrate);
}

/**
 * Validate runtime availability
 */
export function validateRuntimeAvailability(runtime: 'react' | 'preact'): void {
  if (runtime === 'react' && !isReactAvailable()) {
    throw new Error('React runtime selected but React/ReactDOM not available globally');
  }

  if (runtime === 'preact' && !isPreactAvailable()) {
    throw new Error('Preact runtime selected but Preact not available globally');
  }
}
