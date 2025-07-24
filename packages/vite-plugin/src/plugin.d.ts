import type { Plugin } from 'vite';
export interface AstroVitePluginOptions {
    /**
     * Enable development mode features
     */
    dev?: boolean;
    /**
     * Enable pretty printing for HTML output
     */
    prettyPrint?: boolean;
    /**
     * Custom file extensions to handle
     */
    extensions?: string[];
}
export declare function astroVitePlugin(options?: AstroVitePluginOptions): Plugin;
//# sourceMappingURL=plugin.d.ts.map