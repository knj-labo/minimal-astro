# @minimal-astro/compiler

The compiler package for minimal-astro. Handles parsing .astro files and building HTML output.

## Components

- **Tokenizer**: Tokenizes .astro source code into tokens
- **Parser**: Parses tokens into an AST (Abstract Syntax Tree)
- **HTML Builder**: Converts AST to HTML output

## Installation

```bash
pnpm add @minimal-astro/compiler
```

## Usage

```typescript
import { parseAstro } from '@minimal-astro/compiler/parser';
import { buildHtml } from '@minimal-astro/compiler/html-builder';

const source = `
---
const title = "Hello World";
---
<h1>{title}</h1>
`;

const { ast } = parseAstro(source);
const html = buildHtml(ast);
```