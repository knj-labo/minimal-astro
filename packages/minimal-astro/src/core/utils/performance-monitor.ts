/**
 * Performance monitoring and metrics collection for minimal-astro
 * Provides runtime performance insights and optimization suggestions
 */

import { createContextualLogger } from "./logger.js";

const logger = createContextualLogger({ module: "performance-monitor" });

export interface PerformanceMetric {
	name: string;
	duration: number;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

export interface PerformanceReport {
	totalDuration: number;
	operations: PerformanceMetric[];
	averages: Record<string, number>;
	suggestions: string[];
}

/**
 * Performance monitor for tracking operation timings
 */
export function createPerformanceMonitor() {
	const metrics: PerformanceMetric[] = [];
	const operationCounts = new Map<string, number>();

	return {
		/**
		 * Time an operation
		 */
		time<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
			const start = performance.now();
			try {
				const result = fn();
				const duration = performance.now() - start;

				metrics.push({
					name,
					duration,
					timestamp: Date.now(),
					metadata,
				});

				operationCounts.set(name, (operationCounts.get(name) ?? 0) + 1);

				if (duration > 100) {
					// Log slow operations
					logger.warn(`Slow operation detected: ${name}`, {
						duration: `${duration.toFixed(2)}ms`,
						metadata,
					});
				}

				return result;
			} catch (error) {
				const duration = performance.now() - start;
				metrics.push({
					name: `${name} (error)`,
					duration,
					timestamp: Date.now(),
					metadata: { ...metadata, error: String(error) },
				});
				throw error;
			}
		},

		/**
		 * Time an async operation
		 */
		async timeAsync<T>(
			name: string,
			fn: () => Promise<T>,
			metadata?: Record<string, unknown>,
		): Promise<T> {
			const start = performance.now();
			try {
				const result = await fn();
				const duration = performance.now() - start;

				metrics.push({
					name,
					duration,
					timestamp: Date.now(),
					metadata,
				});

				operationCounts.set(name, (operationCounts.get(name) ?? 0) + 1);

				if (duration > 100) {
					// Log slow operations
					logger.warn(`Slow async operation detected: ${name}`, {
						duration: `${duration.toFixed(2)}ms`,
						metadata,
					});
				}

				return result;
			} catch (error) {
				const duration = performance.now() - start;
				metrics.push({
					name: `${name} (error)`,
					duration,
					timestamp: Date.now(),
					metadata: { ...metadata, error: String(error) },
				});
				throw error;
			}
		},

		/**
		 * Mark a point in time
		 */
		mark(name: string, metadata?: Record<string, unknown>): void {
			metrics.push({
				name,
				duration: 0,
				timestamp: Date.now(),
				metadata,
			});
		},

		/**
		 * Get all collected metrics
		 */
		getMetrics(): readonly PerformanceMetric[] {
			return [...metrics];
		},

		/**
		 * Generate a performance report
		 */
		getReport(): PerformanceReport {
			const operationTotals = new Map<string, number>();
			let totalDuration = 0;

			for (const metric of metrics) {
				if (metric.duration > 0) {
					totalDuration += metric.duration;
					operationTotals.set(
						metric.name,
						(operationTotals.get(metric.name) ?? 0) + metric.duration,
					);
				}
			}

			const averages: Record<string, number> = {};
			for (const [operation, total] of operationTotals) {
				const count = operationCounts.get(operation) ?? 1;
				averages[operation] = total / count;
			}

			const suggestions = generateSuggestions(averages, operationTotals);

			return {
				totalDuration,
				operations: [...metrics],
				averages,
				suggestions,
			};
		},

		/**
		 * Clear all metrics
		 */
		clear(): void {
			metrics.length = 0;
			operationCounts.clear();
		},

		/**
		 * Get operation counts
		 */
		getCounts(): ReadonlyMap<string, number> {
			return new Map(operationCounts);
		},
	};
}

/**
 * Generate performance suggestions based on metrics
 */
function generateSuggestions(
	averages: Record<string, number>,
	totals: Map<string, number>,
): string[] {
	const suggestions: string[] = [];

	// Check for slow parsing
	if (averages.parse > 50) {
		suggestions.push(
			"Consider simplifying .astro file structure to improve parse times",
		);
	}

	// Check for slow transformations
	if (averages.transform > 100) {
		suggestions.push(
			"Transform operations are slow - consider reducing component complexity",
		);
	}

	// Check for frequent operations
	const parseTotal = totals.get("parse") ?? 0;
	if (parseTotal > 1000) {
		suggestions.push("High parse time total - consider caching parsed results");
	}

	// Check for render performance
	if (averages.render > 30) {
		suggestions.push("Rendering is slow - consider optimizing component logic");
	}

	// Memory-related suggestions
	const totalOperations = Array.from(totals.values()).reduce(
		(a, b) => a + b,
		0,
	);
	if (totalOperations > 5000) {
		suggestions.push(
			"High total operation time - consider using object pooling",
		);
	}

	return suggestions;
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = createPerformanceMonitor();

/**
 * Decorator for timing methods
 */
export function timed(operation?: string) {
	return function decorator(
		_target: unknown,
		propertyKey: string,
		descriptor: PropertyDescriptor,
	) {
		const originalMethod = descriptor.value;
		const operationName = operation ?? `${String(propertyKey)}`;

		descriptor.value = function (this: unknown, ...args: unknown[]) {
			return globalPerformanceMonitor.time(
				operationName,
				() => originalMethod.apply(this, args),
				{
					method: propertyKey,
					args: args.length,
				},
			);
		};

		return descriptor;
	};
}

/**
 * Decorator for timing async methods
 */
export function timedAsync(operation?: string) {
	return function decorator(
		_target: unknown,
		propertyKey: string,
		descriptor: PropertyDescriptor,
	) {
		const originalMethod = descriptor.value;
		const operationName = operation ?? `${String(propertyKey)}`;

		descriptor.value = async function (this: unknown, ...args: unknown[]) {
			return globalPerformanceMonitor.timeAsync(
				operationName,
				() => originalMethod.apply(this, args),
				{ method: propertyKey, args: args.length },
			);
		};

		return descriptor;
	};
}

/**
 * Utility function to wrap any function with timing
 */
export function withTiming<T extends unknown[], R>(
	fn: (...args: T) => R,
	operation: string,
): (...args: T) => R {
	return (...args: T): R => {
		return globalPerformanceMonitor.time(operation, () => fn(...args), {
			args: args.length,
		});
	};
}

/**
 * Utility function to wrap any async function with timing
 */
export function withAsyncTiming<T extends unknown[], R>(
	fn: (...args: T) => Promise<R>,
	operation: string,
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		return globalPerformanceMonitor.timeAsync(operation, () => fn(...args), {
			args: args.length,
		});
	};
}

/**
 * Performance budget checker
 */
export function createPerformanceBudget(budgets: Record<string, number>) {
	return {
		check(
			metrics: PerformanceMetric[],
		): Array<{ operation: string; actual: number; budget: number }> {
			const violations: Array<{
				operation: string;
				actual: number;
				budget: number;
			}> = [];

			const operationTotals = new Map<string, number>();
			for (const metric of metrics) {
				if (metric.duration > 0) {
					operationTotals.set(
						metric.name,
						(operationTotals.get(metric.name) ?? 0) + metric.duration,
					);
				}
			}

			for (const [operation, budget] of Object.entries(budgets)) {
				const actual = operationTotals.get(operation) ?? 0;
				if (actual > budget) {
					violations.push({ operation, actual, budget });
				}
			}

			return violations;
		},
	};
}

/**
 * Memory usage tracker
 */
export function trackMemoryUsage() {
	const baseline = process.memoryUsage();

	return {
		getMemoryDelta(): NodeJS.MemoryUsage {
			const current = process.memoryUsage();
			return {
				rss: current.rss - baseline.rss,
				heapTotal: current.heapTotal - baseline.heapTotal,
				heapUsed: current.heapUsed - baseline.heapUsed,
				external: current.external - baseline.external,
				arrayBuffers: current.arrayBuffers - baseline.arrayBuffers,
			};
		},

		getCurrentUsage(): NodeJS.MemoryUsage {
			return process.memoryUsage();
		},

		formatMemoryUsage(usage: NodeJS.MemoryUsage): string {
			const formatBytes = (bytes: number) => {
				const mb = bytes / 1024 / 1024;
				return `${mb.toFixed(2)}MB`;
			};

			return [
				`RSS: ${formatBytes(usage.rss)}`,
				`Heap: ${formatBytes(usage.heapUsed)}/${formatBytes(usage.heapTotal)}`,
				`External: ${formatBytes(usage.external)}`,
			].join(", ");
		},
	};
}
