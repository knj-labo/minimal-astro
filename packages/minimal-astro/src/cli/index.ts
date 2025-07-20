#!/usr/bin/env node

/**
 * Minimal Astro CLI
 * Command line interface for the framework
 */

export { build } from "./build.js";

// Simple CLI implementation
async function main() {
	const command = process.argv[2];

	switch (command) {
		case "build": {
			const { build } = await import("./build.js");
			await build({
				root: process.cwd(),
				outDir: "./dist",
			});
			break;
		}
		default:
			console.log("Usage: minimal-astro <command>");
			console.log("Commands:");
			console.log("  build    Build your Astro site");
			break;
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}
