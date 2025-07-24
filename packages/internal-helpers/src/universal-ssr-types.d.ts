/**
 * Types for Universal SSR renderer
 */
export type FrameworkType = 'react' | 'vue' | 'svelte' | 'auto';
export interface UniversalSSROptions {
    /**
     * Component registries for each framework
     */
    components?: {
        react?: Map<string, unknown>;
        vue?: Map<string, unknown>;
        svelte?: Map<string, unknown>;
    };
    /**
     * Props to pass to components
     */
    props?: Record<string, unknown>;
    /**
     * Framework to use ('auto' will detect from component)
     */
    framework?: FrameworkType;
}
export interface UniversalSSRResult {
    /**
     * Rendered HTML output
     */
    html: string;
    /**
     * Framework that was used
     */
    framework: FrameworkType;
    /**
     * Any error that occurred
     */
    error?: Error;
}
export interface FrameworkRenderer {
    renderComponent: (component: unknown, props: unknown) => Promise<string>;
    createRenderer: (options: unknown) => unknown;
}
//# sourceMappingURL=universal-ssr-types.d.ts.map