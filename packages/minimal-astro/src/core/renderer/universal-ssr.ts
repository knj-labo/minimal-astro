/**
 * Universal SSR renderer that supports React, Vue, and Svelte
 * Automatically detects framework and renders accordingly
 */

import type { ComponentNode } from "../../types/ast.js";
import { createContextualLogger } from "../utils/logger.js";
import { renderReactComponent, createReactSSRRenderer } from "./react-ssr.js";
import { renderVueComponent, createVueSSRRenderer } from "./vue-ssr.js";
import { renderSvelteComponent, createSvelteSSRRenderer } from "./svelte-ssr.js";

// ============================================================================
// TYPES
// ============================================================================

export type FrameworkType = "react" | "vue" | "svelte" | "auto";

export interface UniversalSSROptions {
	/**
	 * Component registries for each framework
	 */
	reactComponents?: Map<string, React.ComponentType<any>>;
	vueComponents?: Map<string, any>;
	svelteComponents?: Map<string, any>;

	/**
	 * Default framework when auto-detection fails
	 */
	defaultFramework?: FrameworkType;

	/**
	 * Whether to include hydration data
	 */
	generateHydrationData?: boolean;

	/**
	 * Development mode
	 */
	dev?: boolean;
}

export interface UniversalSSRResult {
	/**
	 * Rendered HTML string
	 */
	html: string;

	/**
	 * Framework that was used
	 */
	framework: FrameworkType;

	/**
	 * Additional CSS (mainly for Svelte)
	 */
	css?: string;

	/**
	 * Hydration data
	 */
	hydrationData?: any;

	/**
	 * Error that occurred during rendering
	 */
	error?: Error;
}

// ============================================================================
// FRAMEWORK DETECTION
// ============================================================================

/**
 * Detects the framework type based on component name and available registries
 */
function detectFramework(
	componentName: string,
	options: UniversalSSROptions,
): FrameworkType {
	// Check React registry first
	if (options.reactComponents?.has(componentName)) {
		return "react";
	}

	// Check Vue registry
	if (options.vueComponents?.has(componentName)) {
		return "vue";
	}

	// Check Svelte registry
	if (options.svelteComponents?.has(componentName)) {
		return "svelte";
	}

	// Check component naming conventions
	if (componentName.endsWith(".jsx") || componentName.endsWith(".tsx")) {
		return "react";
	}

	if (componentName.endsWith(".vue")) {
		return "vue";
	}

	if (componentName.endsWith(".svelte")) {
		return "svelte";
	}

	// Default to React for JSX-style components
	if (/^[A-Z]/.test(componentName)) {
		return "react";
	}

	return options.defaultFramework || "react";
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

/**
 * Renders a component using the appropriate framework
 */
export function renderUniversalComponent(
	componentName: string,
	props: Record<string, unknown> = {},
	framework: FrameworkType = "auto",
	options: UniversalSSROptions = {},
): UniversalSSRResult {
	const logger = createContextualLogger({ module: "universal-ssr" });

	try {
		// Auto-detect framework if needed
		const actualFramework = framework === "auto" 
			? detectFramework(componentName, options)
			: framework;

		logger.debug(`Rendering ${componentName} with ${actualFramework}`);

		switch (actualFramework) {
			case "react": {
				const component = options.reactComponents?.get(componentName);
				if (!component) {
					const error = new Error(`React component "${componentName}" not found`);
					return { html: `<!-- ${error.message} -->`, framework: actualFramework, error };
				}

				const result = renderReactComponent(componentName, component, props, {
					generateHydrationData: options.generateHydrationData,
					dev: options.dev,
				});

				return {
					html: result.html,
					framework: actualFramework,
					hydrationData: result.hydrationData,
					error: result.error,
				};
			}

			case "vue": {
				const component = options.vueComponents?.get(componentName);
				if (!component) {
					const error = new Error(`Vue component "${componentName}" not found`);
					return { html: `<!-- ${error.message} -->`, framework: actualFramework, error };
				}

				const result = renderVueComponent(componentName, component, props, {
					generateHydrationData: options.generateHydrationData,
					dev: options.dev,
				});

				return {
					html: result.html,
					framework: actualFramework,
					hydrationData: result.hydrationData,
					error: result.error,
				};
			}

			case "svelte": {
				const component = options.svelteComponents?.get(componentName);
				if (!component) {
					const error = new Error(`Svelte component "${componentName}" not found`);
					return { html: `<!-- ${error.message} -->`, framework: actualFramework, error };
				}

				const result = renderSvelteComponent(componentName, component, props, {
					generateHydrationData: options.generateHydrationData,
					dev: options.dev,
				});

				return {
					html: result.html,
					framework: actualFramework,
					css: result.css,
					hydrationData: result.hydrationData,
					error: result.error,
				};
			}

			default: {
				const error = new Error(`Unsupported framework: ${actualFramework}`);
				return {
					html: `<!-- ${error.message} -->`,
					framework: actualFramework,
					error,
				};
			}
		}
	} catch (error) {
		const renderError = error instanceof Error ? error : new Error(String(error));
		logger.error(`Universal render error for ${componentName}`, renderError);

		return {
			html: `<!-- Render error: ${renderError.message} -->`,
			framework: framework === "auto" ? "react" : framework,
			error: renderError,
		};
	}
}

/**
 * Renders a component from AST node using universal renderer
 */
export function renderUniversalComponentFromNode(
	node: ComponentNode,
	options: UniversalSSROptions = {},
): UniversalSSRResult {
	const componentName = node.tag;

	// Extract props from node attributes
	const props = extractPropsFromNode(node);

	return renderUniversalComponent(componentName, props, "auto", options);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extracts props from AST component node
 */
function extractPropsFromNode(node: ComponentNode): Record<string, unknown> {
	const props: Record<string, unknown> = {};

	for (const attr of node.attrs || []) {
		if (attr.name.startsWith("client:")) {
			// Include client directives as props for renderer to handle
			props[attr.name] = attr.value || true;
			continue;
		}

		if (attr.value) {
			try {
				if (attr.value.startsWith("{") || attr.value.startsWith("[")) {
					props[attr.name] = JSON.parse(attr.value);
				} else {
					props[attr.name] = attr.value;
				}
			} catch {
				props[attr.name] = attr.value;
			}
		} else {
			props[attr.name] = true;
		}
	}

	return props;
}

/**
 * Creates a universal SSR renderer with configured options
 */
export function createUniversalSSRRenderer(options: UniversalSSROptions = {}) {
	// Create individual framework renderers
	const reactRenderer = createReactSSRRenderer({
		components: options.reactComponents,
		generateHydrationData: options.generateHydrationData,
		dev: options.dev,
	});

	const vueRenderer = createVueSSRRenderer({
		components: options.vueComponents,
		generateHydrationData: options.generateHydrationData,
		dev: options.dev,
	});

	const svelteRenderer = createSvelteSSRRenderer({
		components: options.svelteComponents,
		generateHydrationData: options.generateHydrationData,
		dev: options.dev,
	});

	return {
		/**
		 * Render a component by name
		 */
		render(
			componentName: string, 
			props: Record<string, unknown> = {},
			framework: FrameworkType = "auto"
		): UniversalSSRResult {
			return renderUniversalComponent(componentName, props, framework, options);
		},

		/**
		 * Render from AST node
		 */
		renderNode(node: ComponentNode): UniversalSSRResult {
			return renderUniversalComponentFromNode(node, options);
		},

		/**
		 * Register a component for a specific framework
		 */
		registerComponent(
			name: string, 
			component: any, 
			framework: Exclude<FrameworkType, "auto">
		): void {
			switch (framework) {
				case "react":
					reactRenderer.register(name, component);
					break;
				case "vue":
					vueRenderer.register(name, component);
					break;
				case "svelte":
					svelteRenderer.register(name, component);
					break;
			}
		},

		/**
		 * Get framework-specific renderer
		 */
		getFrameworkRenderer(framework: Exclude<FrameworkType, "auto">) {
			switch (framework) {
				case "react":
					return reactRenderer;
				case "vue":
					return vueRenderer;
				case "svelte":
					return svelteRenderer;
				default:
					throw new Error(`Unknown framework: ${framework}`);
			}
		},

		/**
		 * Get all registered components across frameworks
		 */
		getAllComponents(): {
			react: Map<string, React.ComponentType<any>>;
			vue: Map<string, any>;
			svelte: Map<string, any>;
		} {
			return {
				react: reactRenderer.getComponents(),
				vue: vueRenderer.getComponents(),
				svelte: svelteRenderer.getComponents(),
			};
		},
	};
}