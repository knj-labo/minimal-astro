#!/usr/bin/env bun

import { processMarkdown } from "./src/index.js";

const testMarkdown = `---
title: "Test Post"
author: "Test Author"
date: 2024-01-01
---

# Hello World

This is a **test** markdown document with *emphasis* and \`code\`.

## Features

- Lists work
- With **bold** text
- And [links](https://example.com)

### Code Block

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Table

| Feature | Status |
|---------|--------|
| Parser  | ✅ Done |
| Renderer| ✅ Done |
`;

async function test() {
	try {
		console.log("🧪 Testing markdown processor...");
		const result = await processMarkdown(testMarkdown);
		
		console.log("\n📄 Frontmatter:");
		console.log(JSON.stringify(result.frontmatter, null, 2));
		
		console.log("\n📊 Metadata:");
		console.log(`Word Count: ${result.wordCount}`);
		console.log(`Reading Time: ${result.readingTime} minutes`);
		
		console.log("\n🔗 Table of Contents:");
		console.log(JSON.stringify(result.toc, null, 2));
		
		console.log("\n📝 Generated HTML:");
		console.log(result.html);
		
		console.log("\n✅ Test completed successfully!");
	} catch (error) {
		console.error("❌ Test failed:", error);
		process.exit(1);
	}
}

test();