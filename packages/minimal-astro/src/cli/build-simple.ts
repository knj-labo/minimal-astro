#!/usr/bin/env node

/**
 * Simple build command that works with current codebase
 * This bypasses TypeScript issues while we fix the imports
 */

import { build } from "./build.js";

async function simpleBuild() {
	try {
		console.log("🚀 Starting build...");
		
		await build({
			inputDir: "./src",
			outputDir: "./dist",
		});
		
		console.log("✅ Build completed!");
	} catch (error) {
		console.error("❌ Build failed:", error);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	simpleBuild();
}