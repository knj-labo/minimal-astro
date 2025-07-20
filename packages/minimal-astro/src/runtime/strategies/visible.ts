/**
 * client:visible hydration strategy
 * Hydrates components when they become visible in the viewport
 */

import type { createEventSystem } from "../event-system.js";
import type { PendingHydration } from "../types.js";

/**
 * Create an intersection observer for visibility-based hydration
 */
function createVisibilityObserver(
	onVisible: (entry: IntersectionObserverEntry) => void,
): IntersectionObserver {
	return new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					onVisible(entry);
				}
			}
		},
		{
			rootMargin: "50px",
		},
	);
}

/**
 * Schedule hydration when component becomes visible
 */
export function scheduleVisible(
	pending: PendingHydration,
	performHydration: (pending: PendingHydration) => void,
	eventSystem: ReturnType<typeof createEventSystem>,
	getObserver: () => IntersectionObserver | undefined,
	setObserver: (observer: IntersectionObserver) => void,
): void {
	const componentId = pending.element.id;

	eventSystem.emit("before-hydrate", {
		componentId,
		element: pending.element,
		props: pending.props,
		directive: "visible",
	});

	let observer = getObserver();

	if (!observer) {
		observer = createVisibilityObserver((entry) => {
			const entryComponentId = entry.target.id;

			try {
				// Find the pending hydration for this component
				// This will be passed from the main hydration runtime
				performHydration(pending);
				observer?.unobserve(entry.target);
			} catch (error) {
				eventSystem.emit("hydration-error", {
					componentId: entryComponentId,
					element: entry.target as HTMLElement,
					error: error instanceof Error ? error : new Error(String(error)),
				});
			}
		});

		setObserver(observer);
	}

	observer.observe(pending.element);
}
