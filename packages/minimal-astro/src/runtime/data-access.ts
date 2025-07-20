/**
 * Pure data access functions for hydration runtime
 * These functions handle getting data without side effects
 */

import type { ComponentType, PendingHydration } from "./types.js";

/**
 * Get hydration data from global window object
 */
export function getHydrationData(): {
	directives: Array<{
		componentId: string;
		type: string;
		value?: string;
		props: Record<string, unknown>;
	}>;
} | null {
	// biome-ignore lint/suspicious/noExplicitAny: Global hydration data access
	const hydrationData = (window as any).__ASTRO_HYDRATION_DATA__;
	return hydrationData || null;
}

/**
 * Find directive data for a specific component
 */
export function findDirectiveForComponent(
	componentId: string,
	hydrationData: ReturnType<typeof getHydrationData>,
): {
	componentId: string;
	type: string;
	value?: string;
	props: Record<string, unknown>;
} | null {
	if (!hydrationData?.directives) {
		return null;
	}

	return (
		hydrationData.directives.find(
			(d: { componentId: string }) => d.componentId === componentId,
		) || null
	);
}

/**
 * Get component from registry by name
 */
export function getComponentFromRegistry(
	componentName: string | null,
	registry: Map<string, ComponentType>,
): ComponentType | null {
	if (!componentName) {
		return null;
	}
	return registry.get(componentName) || null;
}

/**
 * Extract component name from element attributes
 */
export function getComponentName(element: HTMLElement): string | null {
	return element.getAttribute("data-astro-component");
}

/**
 * Create pending hydration object
 */
export function createPendingHydration(
	element: HTMLElement,
	component: ComponentType,
	directive: {
		type: string;
		value?: string;
		props: Record<string, unknown>;
	},
): PendingHydration {
	return {
		element,
		component,
		props: directive.props,
		directive: directive.type,
		value: directive.value,
	};
}

/**
 * Get root element from options
 */
export function getRootElement(
	root?: string | HTMLElement,
): HTMLElement | null {
	const rootRef = root ?? document.body;

	if (typeof rootRef === "string") {
		return document.querySelector(rootRef);
	}

	return rootRef;
}

/**
 * Find all hydration root elements
 */
export function findHydrationRoots(rootElement: HTMLElement): HTMLElement[] {
	const hydrationRoots = rootElement.querySelectorAll("[data-astro-root]");
	return Array.from(hydrationRoots).filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
	);
}

/**
 * Check if component is already hydrated
 */
export function isComponentHydrated(
	componentId: string,
	hydratedSet: ReadonlySet<string>,
): boolean {
	return hydratedSet.has(componentId);
}

/**
 * Validate component hydration requirements
 */
export function validateHydrationRequirements(
	element: HTMLElement,
	componentRegistry: Map<string, ComponentType>,
): {
	isValid: boolean;
	componentId: string | null;
	componentName: string | null;
	component: ComponentType | null;
	error?: string;
} {
	const componentId = element.id;
	if (!componentId) {
		return {
			isValid: false,
			componentId: null,
			componentName: null,
			component: null,
			error: "Element has no ID",
		};
	}

	const componentName = getComponentName(element);
	if (!componentName) {
		return {
			isValid: false,
			componentId,
			componentName: null,
			component: null,
			error: "Element has no component name attribute",
		};
	}

	const component = getComponentFromRegistry(componentName, componentRegistry);
	if (!component) {
		return {
			isValid: false,
			componentId,
			componentName,
			component: null,
			error: `Component ${componentName} not found in registry`,
		};
	}

	return {
		isValid: true,
		componentId,
		componentName,
		component,
	};
}
