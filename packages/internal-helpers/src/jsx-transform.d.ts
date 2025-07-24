/**
 * JSX transformation utilities for Astro components
 * Converts Astro AST to JSX/React code
 */
import type { FragmentNode, Node } from './types/ast.js';
export interface JSXTransformOptions {
    /**
     * Runtime to use (React, Preact, etc.)
     */
    runtime?: 'react' | 'preact';
    /**
     * Import source for jsx runtime
     */
    jsxImportSource?: string;
    /**
     * Whether to use the new JSX transform
     */
    useNewTransform?: boolean;
    /**
     * Fragment component name
     */
    fragmentName?: string;
    /**
     * Create element function name
     */
    createElementName?: string;
}
/**
 * Transform context for tracking state during transformation
 */
interface TransformContext {
    imports: Set<string>;
    components: Set<string>;
    variables: Set<string>;
    depth: number;
}
/**
 * Create a JSX transformer
 */
export declare function createJSXTransformer(options?: JSXTransformOptions): {
    transform: (ast: FragmentNode) => string;
    transformNode: (node: Node, context: TransformContext) => string;
};
/**
 * Transform Astro AST to JSX string
 */
export declare function astToJSX(ast: FragmentNode, options?: JSXTransformOptions): string;
/**
 * Transform Astro AST to React component code
 */
export declare function astToReactComponent(ast: FragmentNode, componentName?: string, options?: JSXTransformOptions): string;
export {};
//# sourceMappingURL=jsx-transform.d.ts.map