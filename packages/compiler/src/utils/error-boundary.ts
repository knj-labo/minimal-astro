/**
 * Error boundary and recovery mechanisms for minimal-astro
 * Provides graceful error handling and recovery strategies
 */

import { createContextualLogger } from './logger.js';

export interface ErrorContext {
  operation: string;
  filename?: string;
  line?: number;
  column?: number;
  context?: Record<string, unknown>;
}

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error, context: ErrorContext) => boolean;
  recover: (error: Error, context: ErrorContext) => unknown;
}

export interface ErrorBoundaryOptions {
  strategies?: RecoveryStrategy[];
  maxRetries?: number;
  fallbackValue?: unknown;
  onError?: (error: Error, context: ErrorContext) => void;
}

const logger = createContextualLogger({ module: 'error-boundary' });

/**
 * Default recovery strategies
 */
const defaultStrategies: RecoveryStrategy[] = [
  {
    name: 'parse-recovery',
    canRecover: (error, context) =>
      context.operation === 'parse' && error.message.includes('Unexpected token'),
    recover: (error, context) => {
      logger.warn('Parse error recovered with partial AST', {
        error: error.message,
        filename: context.filename,
      });
      return {
        type: 'Fragment',
        children: [],
        loc: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      };
    },
  },

  {
    name: 'transform-recovery',
    canRecover: (_error, context) => context.operation === 'transform',
    recover: (error, context) => {
      logger.warn('Transform error recovered with fallback code', {
        error: error.message,
        filename: context.filename,
      });
      return {
        code: `// Error during transformation: ${error.message}\nexport default {};`,
        map: undefined,
      };
    },
  },

  {
    name: 'render-recovery',
    canRecover: (_error, context) => context.operation === 'render',
    recover: (error, context) => {
      logger.warn('Render error recovered with error comment', {
        error: error.message,
        filename: context.filename,
      });
      return `<!-- Render error: ${error.message} -->`;
    },
  },

  {
    name: 'validation-recovery',
    canRecover: (_error, context) => context.operation === 'validation',
    recover: (error, context) => {
      logger.warn('Validation error recovered with empty data', {
        error: error.message,
        context: context.context,
      });
      return { valid: false, data: {}, errors: [error.message] };
    },
  },
];

/**
 * Create an error boundary that can recover from certain types of errors
 */
export function createErrorBoundary(options: ErrorBoundaryOptions = {}) {
  const { strategies = defaultStrategies, maxRetries = 3, fallbackValue = null, onError } = options;

  return {
    /**
     * Execute a function with error boundary protection
     */
    async execute<T>(fn: () => T | Promise<T>, context: ErrorContext): Promise<T> {
      let lastError: Error | null = null;
      let retries = 0;

      while (retries <= maxRetries) {
        try {
          const result = await fn();
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          lastError = err;

          if (onError) {
            onError(err, context);
          }

          // Try recovery strategies
          for (const strategy of strategies) {
            if (strategy.canRecover(err, context)) {
              logger.debug(`Applying recovery strategy: ${strategy.name}`, {
                error: err.message,
                operation: context.operation,
              });

              try {
                return strategy.recover(err, context) as T;
              } catch (recoveryError) {
                logger.warn(`Recovery strategy ${strategy.name} failed`, {
                  originalError: err.message,
                  recoveryError:
                    recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
                });
              }
            }
          }

          retries++;
          if (retries <= maxRetries) {
            logger.debug(
              `Retrying operation ${context.operation} (attempt ${retries}/${maxRetries})`,
              {
                error: err.message,
              }
            );
          }
        }
      }

      // All recovery attempts failed
      if (lastError) {
        logger.error(`Error boundary failed after ${maxRetries} retries`, lastError, {
          operation: context.operation,
          filename: context.filename,
        });

        if (fallbackValue !== null) {
          return fallbackValue as T;
        }

        throw lastError;
      }

      throw new Error('Unexpected error boundary state');
    },

    /**
     * Execute a synchronous function with error boundary protection
     */
    executeSync<T>(fn: () => T, context: ErrorContext): T {
      let lastError: Error | null = null;
      let retries = 0;

      while (retries <= maxRetries) {
        try {
          const result = fn();
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          lastError = err;

          if (onError) {
            onError(err, context);
          }

          // Try recovery strategies
          for (const strategy of strategies) {
            if (strategy.canRecover(err, context)) {
              logger.debug(`Applying recovery strategy: ${strategy.name}`, {
                error: err.message,
                operation: context.operation,
              });

              try {
                return strategy.recover(err, context) as T;
              } catch (recoveryError) {
                logger.warn(`Recovery strategy ${strategy.name} failed`, {
                  originalError: err.message,
                  recoveryError:
                    recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
                });
              }
            }
          }

          retries++;
          if (retries <= maxRetries) {
            logger.debug(
              `Retrying operation ${context.operation} (attempt ${retries}/${maxRetries})`,
              {
                error: err.message,
              }
            );
          }
        }
      }

      // All recovery attempts failed
      if (lastError) {
        logger.error(`Error boundary failed after ${maxRetries} retries`, lastError, {
          operation: context.operation,
          filename: context.filename,
        });

        if (fallbackValue !== null) {
          return fallbackValue as T;
        }

        throw lastError;
      }

      throw new Error('Unexpected error boundary state');
    },

    /**
     * Add a custom recovery strategy
     */
    addStrategy(strategy: RecoveryStrategy): void {
      strategies.push(strategy);
    },

    /**
     * Get current strategies
     */
    getStrategies(): readonly RecoveryStrategy[] {
      return [...strategies];
    },
  };
}

/**
 * Global error boundary instance for convenience
 */
export const globalErrorBoundary = createErrorBoundary();

/**
 * Decorator function for methods that need error boundary protection
 */
export function withErrorBoundary<T extends unknown[], R>(
  operation: string,
  options?: Partial<ErrorBoundaryOptions>
) {
  return function decorator(
    _target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => R>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    const boundary = createErrorBoundary(options);

    descriptor.value = function (this: unknown, ...args: T): R {
      return boundary.executeSync(() => originalMethod.apply(this, args), {
        operation,
        context: { method: propertyKey, args: args.length },
      });
    };

    return descriptor;
  };
}

/**
 * Async decorator function for methods that need error boundary protection
 */
export function withAsyncErrorBoundary<T extends unknown[], R>(
  operation: string,
  options?: Partial<ErrorBoundaryOptions>
) {
  return function decorator(
    _target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    const boundary = createErrorBoundary(options);

    descriptor.value = async function (this: unknown, ...args: T): Promise<R> {
      return boundary.execute(() => originalMethod.apply(this, args), {
        operation,
        context: { method: propertyKey, args: args.length },
      });
    };

    return descriptor;
  };
}

/**
 * Utility function to wrap any function with error boundary
 */
export function safeExecute<T>(
  fn: () => T,
  context: ErrorContext,
  options?: ErrorBoundaryOptions
): T {
  const boundary = createErrorBoundary(options);
  return boundary.executeSync(fn, context);
}

/**
 * Utility function to wrap any async function with error boundary
 */
export function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  options?: ErrorBoundaryOptions
): Promise<T> {
  const boundary = createErrorBoundary(options);
  return boundary.execute(fn, context);
}
