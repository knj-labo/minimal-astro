import type { Diagnostic } from '../../types/src/ast.js';

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
export function safeExecute<T>(
  fn: () => T,
  options: {
    operation: string;
    filename?: string;
    context?: Record<string, unknown>;
  },
  fallback: {
    fallbackValue: T;
    diagnostics?: Diagnostic[];
  }
): T {
  try {
    return fn();
  } catch (error) {
    const diagnostic: Diagnostic = {
      code: 'internal-error',
      message: `An internal error occurred during ${options.operation}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      severity: 'error',
      loc: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: 0 },
      },
    };

    // Log the error with more details for debugging
    console.error(
      `[${options.operation}] Internal Error in ${options.filename ?? 'unknown file'}:`,
      {
        error,
        context: options.context,
      }
    );

    // If the fallback value is an object with a diagnostics array, add the error
    if (
      fallback.fallbackValue &&
      typeof fallback.fallbackValue === 'object' &&
      'diagnostics' in fallback.fallbackValue &&
      Array.isArray(fallback.fallbackValue.diagnostics)
    ) {
      fallback.fallbackValue.diagnostics.push(diagnostic);
    }

    return fallback.fallbackValue;
  }
}
