/**
 * Simple event system for hydration lifecycle hooks
 * Allows frameworks to hook into hydration events
 */

export interface HydrationEvents {
	"before-hydrate": {
		componentId: string;
		element: HTMLElement;
		props: Record<string, unknown>;
		directive: string;
	};
	"after-hydrate": {
		componentId: string;
		element: HTMLElement;
		success: boolean;
		duration: number;
	};
	"hydration-error": {
		componentId: string;
		element: HTMLElement;
		error: Error;
	};
	cleanup: {
		componentId: string;
		element: HTMLElement;
	};
}

export interface FrameworkHooks {
	onBeforeHydrate?: (data: HydrationEvents["before-hydrate"]) => void;
	onAfterHydrate?: (data: HydrationEvents["after-hydrate"]) => void;
	onHydrationError?: (data: HydrationEvents["hydration-error"]) => void;
	onCleanup?: (data: HydrationEvents["cleanup"]) => void;
}

/**
 * Simple event emitter for hydration lifecycle events
 */
export function createEventSystem(): {
	emit<K extends keyof HydrationEvents>(
		event: K,
		data: HydrationEvents[K],
	): void;
	on<K extends keyof HydrationEvents>(
		event: K,
		handler: (data: HydrationEvents[K]) => void,
	): void;
	off<K extends keyof HydrationEvents>(
		event: K,
		handler: (data: HydrationEvents[K]) => void,
	): void;
} {
	// biome-ignore lint/suspicious/noExplicitAny: Need generic handler type for event system
	const listeners = new Map<keyof HydrationEvents, Set<(data: any) => void>>();

	return {
		emit<K extends keyof HydrationEvents>(
			event: K,
			data: HydrationEvents[K],
		): void {
			const eventListeners = listeners.get(event);
			if (eventListeners) {
				for (const listener of eventListeners) {
					try {
						listener(data);
					} catch (error) {
						console.error(
							`Error in hydration event listener for ${String(event)}:`,
							error,
						);
					}
				}
			}
		},

		on<K extends keyof HydrationEvents>(
			event: K,
			handler: (data: HydrationEvents[K]) => void,
		): void {
			if (!listeners.has(event)) {
				listeners.set(event, new Set());
			}
			listeners.get(event)?.add(handler);
		},

		off<K extends keyof HydrationEvents>(
			event: K,
			handler: (data: HydrationEvents[K]) => void,
		): void {
			const eventListeners = listeners.get(event);
			if (eventListeners) {
				eventListeners.delete(handler);
				if (eventListeners.size === 0) {
					listeners.delete(event);
				}
			}
		},
	};
}

/**
 * Register framework hooks with the event system
 */
export function registerFrameworkHooks(
	eventSystem: ReturnType<typeof createEventSystem>,
	hooks: FrameworkHooks,
): void {
	if (hooks.onBeforeHydrate) {
		eventSystem.on("before-hydrate", hooks.onBeforeHydrate);
	}
	if (hooks.onAfterHydrate) {
		eventSystem.on("after-hydrate", hooks.onAfterHydrate);
	}
	if (hooks.onHydrationError) {
		eventSystem.on("hydration-error", hooks.onHydrationError);
	}
	if (hooks.onCleanup) {
		eventSystem.on("cleanup", hooks.onCleanup);
	}
}
