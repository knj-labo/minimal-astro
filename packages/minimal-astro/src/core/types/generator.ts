/**
 * TypeScript type generation for Minimal Astro
 * Generates types for Content Collections and configuration
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { createContextualLogger } from "../utils/logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface TypeGenerationOptions {
	/**
	 * Output directory for generated types
	 */
	outDir: string;

	/**
	 * Content collections configuration
	 */
	collections?: Record<string, CollectionConfig>;

	/**
	 * Project root directory
	 */
	projectRoot?: string;
}

export interface CollectionConfig {
	/**
	 * Schema definition (stringified)
	 */
	schema?: string;

	/**
	 * Collection type (content or data)
	 */
	type?: "content" | "data";

	/**
	 * File glob pattern
	 */
	glob?: string;
}

export interface GeneratedTypes {
	/**
	 * Generated TypeScript content
	 */
	content: string;

	/**
	 * Output file path
	 */
	filePath: string;

	/**
	 * Collection names processed
	 */
	collections: string[];
}

// ============================================================================
// TYPE TEMPLATES
// ============================================================================

/**
 * Base template for generated types
 */
const BASE_TEMPLATE = `/**
 * Generated types for Minimal Astro
 * This file is auto-generated. Do not edit manually.
 */

// Base types for Content Collections
export interface CollectionEntry<T extends keyof ContentEntryMap> {
	id: string;
	slug: string;
	body: string;
	collection: T;
	data: ContentEntryMap[T];
}

export interface DataEntry<T extends keyof DataEntryMap> {
	id: string;
	collection: T;
	data: DataEntryMap[T];
}

// Utility functions
export function getCollection<T extends keyof ContentEntryMap>(
	collection: T
): Promise<CollectionEntry<T>[]>;
export function getCollection<T extends keyof DataEntryMap>(
	collection: T
): Promise<DataEntry<T>[]>;
export function getCollection(collection: string): Promise<any[]> {
	// Implementation provided by runtime
	throw new Error("getCollection must be called within Astro runtime");
}

export function getEntry<T extends keyof ContentEntryMap>(
	collection: T,
	id: string
): Promise<CollectionEntry<T> | undefined>;
export function getEntry<T extends keyof DataEntryMap>(
	collection: T,
	id: string
): Promise<DataEntry<T> | undefined>;
export function getEntry(collection: string, id: string): Promise<any | undefined> {
	// Implementation provided by runtime
	throw new Error("getEntry must be called within Astro runtime");
}

`;

/**
 * Template for collection type maps
 */
const COLLECTION_MAPS_TEMPLATE = `
// Collection type maps
export interface ContentEntryMap {
{{contentCollections}}
}

export interface DataEntryMap {
{{dataCollections}}
}

// Convenience types
export type ContentCollectionKey = keyof ContentEntryMap;
export type DataCollectionKey = keyof DataEntryMap;
export type AnyCollectionKey = ContentCollectionKey | DataCollectionKey;
`;

// ============================================================================
// SCHEMA PARSING
// ============================================================================

/**
 * Converts a Zod schema string to TypeScript type
 */
function zodSchemaToTypeScript(schemaString: string): string {
	// This is a simplified conversion - real implementation would parse Zod AST
	return schemaString
		// Basic type conversions
		.replace(/z\.string\(\)/g, "string")
		.replace(/z\.number\(\)/g, "number")
		.replace(/z\.boolean\(\)/g, "boolean")
		.replace(/z\.date\(\)/g, "Date")
		.replace(/z\.array\(([^)]+)\)/g, "Array<$1>")
		.replace(/z\.optional\(([^)]+)\)/g, "$1 | undefined")
		.replace(/z\.object\(\{([^}]+)\}\)/g, "{ $1 }")
		// Clean up
		.replace(/z\./g, "")
		.replace(/\(\)/g, "")
		// Format object properties
		.replace(/(\w+):\s*([^,}]+)/g, "$1: $2");
}

/**
 * Generates TypeScript interface from schema
 */
function generateInterfaceFromSchema(
	collectionName: string,
	schema: string,
): string {
	const interfaceName = `${capitalizeFirst(collectionName)}Entry`;
	const typeDefinition = zodSchemaToTypeScript(schema);
	
	return `export interface ${interfaceName} ${typeDefinition}`;
}

/**
 * Capitalizes first letter of a string
 */
function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// TYPE GENERATION
// ============================================================================

/**
 * Generates collection type entry
 */
function generateCollectionEntry(
	name: string,
	config: CollectionConfig,
): string {
	const interfaceName = `${capitalizeFirst(name)}Entry`;
	
	if (config.schema) {
		return `\t${name}: ${interfaceName};`;
	}
	
	// Default to any if no schema provided
	return `\t${name}: any;`;
}

/**
 * Generates all type definitions
 */
export async function generateTypes(
	options: TypeGenerationOptions,
): Promise<GeneratedTypes> {
	const logger = createContextualLogger({ module: "type-generator" });
	const { outDir, collections = {}, projectRoot = process.cwd() } = options;

	try {
		logger.info("Generating TypeScript types for Content Collections");

		// Separate content and data collections
		const contentCollections: string[] = [];
		const dataCollections: string[] = [];
		const interfaceDefinitions: string[] = [];

		for (const [name, config] of Object.entries(collections)) {
			if (config.type === "data") {
				dataCollections.push(generateCollectionEntry(name, config));
			} else {
				contentCollections.push(generateCollectionEntry(name, config));
			}

			// Generate interface if schema exists
			if (config.schema) {
				interfaceDefinitions.push(
					generateInterfaceFromSchema(name, config.schema)
				);
			}
		}

		// Build the complete type definition
		let typeContent = BASE_TEMPLATE;

		// Add interface definitions
		if (interfaceDefinitions.length > 0) {
			typeContent += "\n// Collection interfaces\n";
			typeContent += interfaceDefinitions.join("\n\n") + "\n";
		}

		// Add collection maps
		const collectionMaps = COLLECTION_MAPS_TEMPLATE
			.replace("{{contentCollections}}", 
				contentCollections.length > 0 
					? contentCollections.join("\n") 
					: "\t// No content collections defined"
			)
			.replace("{{dataCollections}}", 
				dataCollections.length > 0 
					? dataCollections.join("\n") 
					: "\t// No data collections defined"
			);

		typeContent += collectionMaps;

		// Ensure output directory exists
		const outputPath = join(outDir, "content.d.ts");
		const outputDir = dirname(outputPath);
		
		if (!existsSync(outputDir)) {
			await mkdir(outputDir, { recursive: true });
		}

		// Write the generated types
		await writeFile(outputPath, typeContent, "utf-8");

		logger.info(`Generated types for ${Object.keys(collections).length} collections`, {
			outputPath,
			collections: Object.keys(collections),
		});

		return {
			content: typeContent,
			filePath: outputPath,
			collections: Object.keys(collections),
		};
	} catch (error) {
		logger.error("Failed to generate types", error as Error);
		throw error;
	}
}

/**
 * Generates environment types for Astro
 */
export async function generateAstroEnvTypes(outDir: string): Promise<void> {
	const envTypesContent = `/**
 * Environment types for Minimal Astro
 * This file is auto-generated. Do not edit manually.
 */

declare namespace Astro {
	interface Props {
		[key: string]: any;
	}

	interface Locals {
		[key: string]: any;
	}

	interface Page {
		url: URL;
		params: Record<string, string>;
		props: Record<string, any>;
	}

	interface Global {
		// Global Astro object
		props: Props;
		locals: Locals;
		url: URL;
		params: Record<string, string>;
		request: Request;
		redirect: (url: string, status?: number) => Response;
	}
}

// Augment global scope
declare global {
	const Astro: Astro.Global;
}

// Client directives
declare module "*.astro" {
	const Component: (props: any) => any;
	export default Component;
}

// Image imports
declare module "*.png" {
	const src: string;
	export default src;
}

declare module "*.jpg" {
	const src: string;
	export default src;
}

declare module "*.jpeg" {
	const src: string;
	export default src;
}

declare module "*.gif" {
	const src: string;
	export default src;
}

declare module "*.svg" {
	const src: string;
	export default src;
}

declare module "*.webp" {
	const src: string;
	export default src;
}
`;

	const envTypesPath = join(outDir, "env.d.ts");
	await writeFile(envTypesPath, envTypesContent, "utf-8");
}

/**
 * Creates a type generator with configured options
 */
export function createTypeGenerator(options: TypeGenerationOptions) {
	return {
		/**
		 * Generate all types
		 */
		async generateAll(): Promise<GeneratedTypes> {
			const result = await generateTypes(options);
			await generateAstroEnvTypes(options.outDir);
			return result;
		},

		/**
		 * Generate only collection types
		 */
		async generateCollectionTypes(): Promise<GeneratedTypes> {
			return generateTypes(options);
		},

		/**
		 * Generate only environment types
		 */
		async generateEnvTypes(): Promise<void> {
			await generateAstroEnvTypes(options.outDir);
		},

		/**
		 * Watch for changes and regenerate types
		 */
		async watch(): Promise<void> {
			// TODO: Implement file watching for type regeneration
			throw new Error("Type watching not yet implemented");
		},
	};
}