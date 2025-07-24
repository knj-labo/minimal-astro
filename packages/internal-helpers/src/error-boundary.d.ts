/**
 * Error boundary and recovery mechanisms for minimal-astro
 * Provides graceful error handling and recovery strategies
 */
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
/**
 * Create an error boundary that can recover from certain types of errors
 */
export declare function createErrorBoundary(options?: ErrorBoundaryOptions): {
    /**
     * Execute a function with error boundary protection
     */
    execute<T>(fn: () => T | Promise<T>, context: ErrorContext): Promise<T>;
    /**
     * Execute a synchronous function with error boundary protection
     */
    executeSync<T>(fn: () => T, context: ErrorContext): T;
    /**
     * Add a custom recovery strategy
     */
    addStrategy(strategy: RecoveryStrategy): void;
    /**
     * Get current strategies
     */
    getStrategies(): readonly RecoveryStrategy[];
};
/**
 * Global error boundary instance for convenience
 */
export declare const globalErrorBoundary: {
    /**
     * Execute a function with error boundary protection
     */
    execute<T>(fn: () => T | Promise<T>, context: ErrorContext): Promise<T>;
    /**
     * Execute a synchronous function with error boundary protection
     */
    executeSync<T>(fn: () => T, context: ErrorContext): T;
    /**
     * Add a custom recovery strategy
     */
    addStrategy(strategy: RecoveryStrategy): void;
    /**
     * Get current strategies
     */
    getStrategies(): readonly RecoveryStrategy[];
};
/**
 * Decorator function for methods that need error boundary protection
 */
export declare function withErrorBoundary<T extends unknown[], R>(operation: string, options?: Partial<ErrorBoundaryOptions>): (_target: unknown, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: T) => R>) => TypedPropertyDescriptor<(...args: T) => R>;
/**
 * Async decorator function for methods that need error boundary protection
 */
export declare function withAsyncErrorBoundary<T extends unknown[], R>(operation: string, options?: Partial<ErrorBoundaryOptions>): (_target: unknown, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>) => TypedPropertyDescriptor<(...args: T) => Promise<R>>;
/**
 * Utility function to wrap any function with error boundary
 */
export declare function safeExecute<T>(fn: () => T, context: ErrorContext, options?: ErrorBoundaryOptions): T;
/**
 * Utility function to wrap any async function with error boundary
 */
export declare function safeExecuteAsync<T>(fn: () => Promise<T>, context: ErrorContext, options?: ErrorBoundaryOptions): Promise<T>;
//# sourceMappingURL=error-boundary.d.ts.map