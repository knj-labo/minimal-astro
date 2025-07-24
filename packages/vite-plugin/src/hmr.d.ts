import type { FragmentNode } from '@minimal-astro/types/ast';
import type { HmrContext, ModuleNode } from 'vite';
export interface HmrUpdateContext {
    file: string;
    modules: Array<ModuleNode>;
    server: HmrContext['server'];
    read: HmrContext['read'];
}
export interface AstroHmrState {
    hasClientDirectives: boolean;
    imports: string[];
    exports: string[];
    cssModules: string[];
    styleBlocks: string[];
    dependencies: Set<string>;
}
/**
 * Analyzes an AST to determine HMR boundaries and dependencies
 */
export declare function analyzeAstForHmr(ast: FragmentNode, _filePath: string): AstroHmrState;
/**
 * Determines if a component can be hot-reloaded or needs a full page reload
 */
export declare function canHotReload(oldState: AstroHmrState, newState: AstroHmrState): boolean;
/**
 * Handles HMR updates for .astro files
 */
export declare function handleAstroHmr(ctx: HmrUpdateContext, oldState: AstroHmrState, newState: AstroHmrState): ModuleNode[];
/**
 * Creates HMR client-side code for .astro components
 */
export declare function createHmrClientCode(filePath: string): string;
/**
 * Injects HMR code into the transformed JavaScript
 */
export declare function injectHmrCode(jsCode: string, filePath: string, dev: boolean): string;
/**
 * Enhanced HMR update that handles CSS changes
 */
export declare function handleCssUpdate(ctx: HmrUpdateContext, oldState: AstroHmrState, newState: AstroHmrState): void;
/**
 * Create error overlay for development
 */
export declare function createErrorOverlay(error: Error, filePath: string): string;
//# sourceMappingURL=hmr.d.ts.map