import type { FragmentNode } from '@minimal-astro/types/ast';
export interface HtmlBuilderOptions {
    prettyPrint?: boolean;
    indent?: string;
    streaming?: boolean;
    chunkSize?: number;
    evaluateExpressions?: boolean;
    escapeHtml?: boolean;
}
export interface StreamingOptions {
    chunkSize?: number;
    write: (chunk: string) => Promise<void>;
}
/**
 * Manual loop optimization for hot paths (exported for potential use)
 */
export declare function escapeHtmlFast(text: string): string;
/**
 * Legacy escape function for backward compatibility (exported for testing)
 */
export declare function escapeHtmlLegacy(text: string): string;
/**
 * Builds HTML string from an AST
 */
export declare function buildHtml(ast: FragmentNode, options?: HtmlBuilderOptions): string;
/**
 * Streaming HTML builder for memory-efficient processing
 */
export declare function createStreamingHtmlBuilder(options?: HtmlBuilderOptions): {
    /**
     * Build HTML to a stream with chunked processing
     */
    buildToStream: (ast: FragmentNode, streamOptions: StreamingOptions) => Promise<void>;
};
/**
 * Convenience function to build HTML to stream
 */
export declare function buildHtmlToStream(ast: FragmentNode, streamOptions: StreamingOptions, builderOptions?: HtmlBuilderOptions): Promise<void>;
//# sourceMappingURL=html-builder.d.ts.map