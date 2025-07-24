import type { FragmentNode } from '@minimal-astro/types/ast';
export interface TransformOptions {
    filename: string;
    dev?: boolean;
    prettyPrint?: boolean;
    ssr?: boolean;
    framework?: 'react' | 'preact' | 'vanilla';
    components?: Map<string, unknown>;
    sourceMap?: boolean;
    renderers?: Record<string, unknown>;
}
export interface TransformResult {
    code: string;
    map?: string;
}
/**
 * Transform an Astro AST to a JavaScript module
 */
export declare function transformAstroToJs(ast: FragmentNode, options: TransformOptions): TransformResult;
/**
 * Extract client-side JavaScript from components
 */
export declare function extractClientScript(ast: FragmentNode, options?: {
    framework?: 'react' | 'preact' | 'vanilla';
}): string | null;
/**
 * Check if the component has client directives
 */
export declare function hasClientDirectives(ast: FragmentNode): boolean;
//# sourceMappingURL=transform.d.ts.map