/**
 * React renderer for Astro components
 * Handles SSR and client-side rendering with hydration support
 */
import type { FragmentNode } from '@minimal-astro/internal-helpers';
type ComponentType<P = Record<string, unknown>> = (props: P) => unknown;
export interface ReactRendererOptions {
    /**
     * Mode of rendering
     */
    mode: 'ssr' | 'client';
    /**
     * Whether to include hydration markers
     */
    hydrate?: boolean;
    /**
     * Component registry for resolving imports
     */
    components?: Map<string, ComponentType>;
    /**
     * Props to pass to the root component
     */
    props?: Record<string, unknown>;
}
export interface RenderResult {
    /**
     * The rendered HTML string (SSR) or React element (client)
     */
    output: string | unknown;
    /**
     * Hydration data for client-side
     */
    hydrationData?: HydrationData;
    /**
     * Scripts needed for hydration
     */
    scripts?: string[];
}
export interface HydrationData {
    /**
     * Component props for hydration
     */
    props: Record<string, unknown>;
    /**
     * Client directives and their configurations
     */
    directives: ClientDirective[];
    /**
     * Component paths for lazy loading
     */
    componentPaths: Record<string, string>;
}
export interface ClientDirective {
    /**
     * The directive type
     */
    type: 'load' | 'idle' | 'visible' | 'media' | 'only';
    /**
     * Directive value (e.g., media query)
     */
    value?: string;
    /**
     * Component ID for hydration
     */
    componentId: string;
    /**
     * Props to hydrate with
     */
    props: Record<string, unknown>;
}
/**
 * Creates a React renderer for Astro components
 */
export declare function createReactRenderer(options: ReactRendererOptions): {
    render(ast: FragmentNode): RenderResult;
    /**
     * Render a single component (useful for testing)
     */
    renderComponent(Component: ComponentType, props: Record<string, unknown>): string;
};
/**
 * Create SSR renderer
 */
export declare function createSSRRenderer(options?: Omit<ReactRendererOptions, 'mode'>): {
    render(ast: FragmentNode): RenderResult;
    /**
     * Render a single component (useful for testing)
     */
    renderComponent(Component: ComponentType, props: Record<string, unknown>): string;
};
/**
 * Create client renderer
 */
export declare function createClientRenderer(options?: Omit<ReactRendererOptions, 'mode'>): {
    render(ast: FragmentNode): RenderResult;
    /**
     * Render a single component (useful for testing)
     */
    renderComponent(Component: ComponentType, props: Record<string, unknown>): string;
};
export {};
//# sourceMappingURL=renderer.d.ts.map