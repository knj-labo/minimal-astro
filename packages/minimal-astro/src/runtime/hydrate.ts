/**
 * Hydration runtime for Astro components
 * Handles client-side hydration based on directives
 * Refactored for immutability, readability, and framework extensibility
 */

import {
	createPendingHydration,
	findDirectiveForComponent,
	findHydrationRoots,
	getHydrationData,
	getRootElement,
	isComponentHydrated,
	validateHydrationRequirements,
} from "./data-access.js";
import { type FrameworkHooks, createEventSystem } from "./event-system.js";
import {
	createDefaultRenderer,
	validateRuntimeAvailability,
} from "./framework-renderers.js";
import {
	addPending,
	clearObservers,
	createInitialState,
	markAsHydrated,
	removeFromHydrated,
	setIntersectionObserver,
} from "./state-management.js";
import { scheduleIdle } from "./strategies/idle.js";
import { scheduleLoad } from "./strategies/load.js";
import { scheduleMedia } from "./strategies/media.js";
import { scheduleOnly } from "./strategies/only.js";
import { scheduleVisible } from "./strategies/visible.js";
import type {
	ComponentType,
	HydrationOptions,
	HydrationRuntime,
	HydrationState,
	PendingHydration,
} from "./types.js";

// Re-export types for backward compatibility
export type {
	ComponentType,
	HydrationOptions,
	PendingHydration,
	HydrationState as HydrationContext,
	HydrationRuntime,
	FrameworkHooks,
};

/**
 * Create hydration runtime with improved organization and event system
 */
export function createHydrationRuntime(
	options: HydrationOptions,
	hooks?: FrameworkHooks,
): HydrationRuntime {
	const { components, runtime, render } = options;

	// Validate runtime availability
	validateRuntimeAvailability(runtime);

	// Create event system for lifecycle hooks
	const eventSystem = createEventSystem();

	// Register framework hooks if provided
	if (hooks) {
		if (hooks.onBeforeHydrate)
			eventSystem.on("before-hydrate", hooks.onBeforeHydrate);
		if (hooks.onAfterHydrate)
			eventSystem.on("after-hydrate", hooks.onAfterHydrate);
		if (hooks.onHydrationError)
			eventSystem.on("hydration-error", hooks.onHydrationError);
		if (hooks.onCleanup) eventSystem.on("cleanup", hooks.onCleanup);
	}

	// Immutable hydration state
	let state: HydrationState = createInitialState();

	// Create render function
	const renderFn = render ?? createDefaultRenderer(runtime);

	/**
	 * Hydrate a component using extracted data access and validation functions
	 */
	function hydrateComponent(element: HTMLElement, immediate = false): void {
		// Validate component requirements
		const validation = validateHydrationRequirements(element, components);
		if (!validation.isValid) {
			console.error(`Cannot hydrate component: ${validation.error}`);
			return;
		}

		const { componentId, component } = validation;
		if (!componentId || !component) return;

		// Check if already hydrated
		if (isComponentHydrated(componentId, state.hydrated)) {
			return;
		}

		// Get hydration data
		const hydrationData = getHydrationData();
		if (!hydrationData) {
			console.error("No hydration data found");
			return;
		}

		// Find directive for this component
		const directive = findDirectiveForComponent(componentId, hydrationData);
		if (!directive) {
			console.error(`No directive found for component ${componentId}`);
			return;
		}

		// Create pending hydration
		const pending = createPendingHydration(element, component, directive);

		if (immediate) {
			performHydration(pending);
		} else {
			state = addPending(state, componentId, pending);
			scheduleHydration(pending);
		}
	}

	/**
	 * Perform the actual hydration with timing and event system
	 */
	function performHydration(pending: PendingHydration): void {
		const { element, component, props } = pending;
		const componentId = element.id;
		const startTime = performance.now();

		try {
			// Mark as hydrated first to prevent double hydration
			state = markAsHydrated(state, componentId);

			// Hydrate the component
			renderFn(component, element);

			// Calculate duration
			const duration = performance.now() - startTime;

			// Emit success event
			eventSystem.emit("after-hydrate", {
				componentId,
				element,
				success: true,
				duration,
			});

			// Dispatch DOM event for backward compatibility
			element.dispatchEvent(
				new CustomEvent("astro:hydrate", {
					detail: { component, props },
				}),
			);
		} catch (error) {
			console.error(`Failed to hydrate component ${componentId}:`, error);

			// Allow retry by removing from hydrated set
			state = removeFromHydrated(state, componentId);

			// Emit error event
			eventSystem.emit("hydration-error", {
				componentId,
				element,
				error: error instanceof Error ? error : new Error(String(error)),
			});
		}
	}

	/**
	 * Schedule hydration using strategy pattern
	 */
	function scheduleHydration(pending: PendingHydration): void {
		const { directive, value } = pending;

		switch (directive) {
			case "load":
				scheduleLoad(pending, performHydration, eventSystem);
				break;

			case "idle":
				scheduleIdle(pending, performHydration, eventSystem);
				break;

			case "visible":
				scheduleVisible(
					pending,
					performHydration,
					eventSystem,
					() => state.observers.intersection,
					(observer) => {
						state = setIntersectionObserver(state, observer);
					},
				);
				break;

			case "media":
				if (value) {
					scheduleMedia(pending, value, performHydration, eventSystem);
				} else {
					console.warn("client:media directive requires a media query value");
					performHydration(pending);
				}
				break;

			case "only":
				scheduleOnly(pending, performHydration, eventSystem);
				break;

			default:
				console.warn(`Unknown hydration directive: ${directive}`);
				performHydration(pending);
		}
	}

	// Visibility and media query observation moved to strategy files

	/**
	 * Find and hydrate all components using extracted data access functions
	 */
	function hydrateAll(): void {
		const rootElement = getRootElement(options.root);
		if (!rootElement) {
			console.error("Root element not found");
			return;
		}

		// Find all hydration roots
		const hydrationRoots = findHydrationRoots(rootElement);

		for (const element of hydrationRoots) {
			hydrateComponent(element);
		}
	}

	/**
	 * Cleanup function with immutable state management
	 */
	function cleanup(): void {
		// Emit cleanup events for all pending components
		for (const [componentId, pending] of state.pending) {
			eventSystem.emit("cleanup", {
				componentId,
				element: pending.element,
			});
		}

		// Clear observers and reset state
		state = clearObservers(state);
		state = createInitialState();
	}

	return {
		hydrateAll,
		hydrateComponent,
		cleanup,
		context: state,
	};
}

// RequestIdleCallback polyfill moved to strategy files

/**
 * Auto-hydration script with framework hooks support
 */
export function autoHydrate(
	options: HydrationOptions,
	hooks?: FrameworkHooks,
): void {
	const initializeRuntime = () => {
		const runtime = createHydrationRuntime(options, hooks);
		runtime.hydrateAll();

		// Store runtime for debugging
		// biome-ignore lint/suspicious/noExplicitAny: Global runtime storage
		(window as any).__ASTRO_RUNTIME__ = runtime;

		return runtime;
	};

	// Wait for DOM ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initializeRuntime);
	} else {
		initializeRuntime();
	}
}

/**
 * Manual hydration function with framework hooks support
 */
export function hydrate(
	componentId: string,
	component: ComponentType,
	_props: Record<string, unknown>,
	options: Partial<HydrationOptions> = {},
	hooks?: FrameworkHooks,
): void {
	const element = document.getElementById(componentId);
	if (!element) {
		console.error(`Element with id ${componentId} not found`);
		return;
	}

	const runtime =
		// biome-ignore lint/suspicious/noExplicitAny: Global runtime access
		(window as any).__ASTRO_RUNTIME__ ??
		createHydrationRuntime(
			{
				components: new Map([[component.name, component]]),
				runtime: options.runtime ?? "react",
				...options,
			},
			hooks,
		);

	runtime.hydrateComponent(element, true);
}
