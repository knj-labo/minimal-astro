import React, { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import type { IslandComponent } from './types';

// Registers a component in the global __ISLANDS__ registry on the client side
export function registerIsland(name: string, component: IslandComponent) {
    if (typeof window !== 'undefined') {
        window.__ISLANDS__ = window.__ISLANDS__ || {};
        window.__ISLANDS__[name] = component;
        console.log(`Registered island: ${name}`);
    }
}

// Finds all elements with [data-island] attribute and hydrates them with the corresponding React component
export function hydrateIslands() {
    if (typeof window === 'undefined') return;

    // The system works by:
    // - Looking for elements with data-island attribute containing the component name
    // - Reading serialized props from data-props attribute
    // - Using React 18's hydrateRoot to make the server-rendered HTML interactive
    const islands = document.querySelectorAll('[data-island]');
    console.log(`Found ${islands.length} islands to hydrate`);

    islands.forEach((element) => {
        const name = element.getAttribute('data-island');

        if (!name) {
            console.warn('Island missing data-island attribute');
            return;
        }

        const Component = window.__ISLANDS__[name];
        if (!Component) {
            console.warn(`Island "${name}" not found in registry`);
            return;
        }

        if (!name || !window.__ISLANDS__[name]) return;

        const propsStr = element.getAttribute('data-props');
        let props = {};
        if (propsStr) {
            try {
                props = JSON.parse(propsStr);
            } catch (e) {
                console.error(`Failed to parse props for "${name}":`, e);
            }
        }

        try {
            // use React.createElement instead of JSX
            const root = hydrateRoot(
                element as HTMLElement,
                React.createElement(StrictMode, null,
                    React.createElement(Component, props)
                )
            );
            console.log(`✓ Hydrated island "${name}"`);
        } catch (error) {
            console.error(`Failed to hydrate "${name}":`, error);
        }
    });
}