import type { Diagnostic } from '@minimal-astro/types/ast';
/**
 * Utility to safely execute a function and handle errors gracefully.
 *
 * @param fn The function to execute.
 * @param options Options for error handling.
 * @param options.operation A string identifying the operation (e.g., 'parse', 'tokenize').
 * @param options.filename The filename being processed.
 * @param options.context Additional context for logging.
 * @param fallback A fallback value to return on error.
 * @returns The result of the function or the fallback value.
 */
export declare function safeExecute<T>(fn: () => T, options: {
    operation: string;
    filename?: string;
    context?: Record<string, unknown>;
}, fallback: {
    fallbackValue: T;
    diagnostics?: Diagnostic[];
}): T;
//# sourceMappingURL=utils.d.ts.map