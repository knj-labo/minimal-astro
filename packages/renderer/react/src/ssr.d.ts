/**
 * React SSR renderer for Astro components
 * Implements proper server-side rendering with React 18
 */
import type { ComponentNode } from '@minimal-astro/internal-helpers';
import React from 'react';
export interface ReactSSROptions {
    /**
     * Component registry for resolving imports
     */
    components?: Map<string, React.ComponentType<unknown>>;
    /**
     * Props to pass to components
     */
    props?: Record<string, unknown>;
    /**
     * Whether to include hydration data
     */
    generateHydrationData?: boolean;
    /**
     * Development mode (includes extra debugging)
     */
    dev?: boolean;
}
export interface SSRResult {
    /**
     * Rendered HTML string
     */
    html: string;
    /**
     * Hydration data for client-side
     */
    hydrationData?: HydrationData;
    /**
     * Error that occurred during rendering
     */
    error?: Error;
}
export interface HydrationData {
    /**
     * Component ID
     */
    id: string;
    /**
     * Component name/path
     */
    component: string;
    /**
     * Props passed to the component
     */
    props: Record<string, unknown>;
    /**
     * Client directive configuration
     */
    directive?: {
        type: 'load' | 'idle' | 'visible' | 'media' | 'only';
        value?: string;
    };
}
/**
 * Renders a React component to HTML string with optional hydration data
 */
export declare function renderReactComponent(componentName: string, componentExport: React.ComponentType<unknown>, props?: Record<string, unknown>, options?: ReactSSROptions): SSRResult;
/**
 * Renders a React component from AST node
 */
export declare function renderReactComponentFromNode(node: ComponentNode, options?: ReactSSROptions): SSRResult;
/**
 * Creates a React SSR renderer with configured options
 */
export declare function createReactSSRRenderer(options?: ReactSSROptions): {
    /**
     * Render a component by name
     */
    render(componentName: string, props?: Record<string, unknown>): SSRResult;
    /**
     * Render from AST node
     */
    renderNode(node: ComponentNode): SSRResult;
    /**
     * Register a component
     */
    register(name: string, component: React.ComponentType<unknown>): void;
    /**
     * Get all registered components
     */
    getComponents(): Map<string, React.ComponentType<unknown>>;
};
//# sourceMappingURL=ssr.d.ts.map