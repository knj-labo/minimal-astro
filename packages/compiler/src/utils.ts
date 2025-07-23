/**
 * Execute a function safely, catching any errors
 */
export function safeExecute<T>(
  fn: () => T,
  fallback: T,
  onError?: (error: Error) => void
): T {
  try {
    return fn();
  } catch (error) {
    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
    return fallback;
  }
}