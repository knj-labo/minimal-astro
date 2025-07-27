/**
 * TypeScript stripping module using SWC
 * Provides fast and accurate TypeScript type removal without type checking
 *
 * @module typescript-stripper
 */

import { type Options, transformSync } from '@swc/core';

/**
 * Options for TypeScript stripping
 * @interface StripTypeScriptOptions
 */
export interface StripTypeScriptOptions {
  /** Whether to preserve JSX syntax (for React/Preact) */
  jsx?: boolean;
  /** Source filename for better error messages */
  filename?: string;
}

/**
 * Strips TypeScript types from source code using SWC
 * This is much faster and more accurate than regex-based stripping
 *
 * @param {string} code - TypeScript source code
 * @param {StripTypeScriptOptions} options - Stripping options
 * @returns {string} JavaScript code with types removed
 *
 * @example
 * const js = stripTypeScriptWithSwc('const x: number = 5;', {});
 * // Returns: 'const x = 5;'
 */
export function stripTypeScript(code: string, options: StripTypeScriptOptions): string {
  const swcOptions: Options = {
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: options.jsx,
      },
      target: 'es2022',
      transform: {},
    },
    sourceMaps: false,
    filename: options.filename,
  };

  const result = transformSync(code, swcOptions);
  return result.code;
}

/**
 * Extracts import statements from TypeScript/JavaScript code using SWC's AST
 * More accurate than regex-based extraction
 *
 * @param {string} code - Source code to analyze
 * @param {StripTypeScriptOptions} options - Parser options
 * @returns {string[]} Array of reconstructed import statements
 *
 * @example
 * const imports = extractImportsWithSwc(
 *   'import React from "react";\nimport { useState } from "react";',
 *   {}
 * );
 * // Returns: ['import React from \'react\';', 'import { useState } from \'react\';']
 *
 * @todo Implement proper AST-based import extraction with full metadata
 */
export function extractImports(code: string, options: StripTypeScriptOptions): string[] {
  const imports: string[] = [];
  const swcOptions: Options = {
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: options.jsx,
      },
      target: 'es2022',
    },
    sourceMaps: false,
    filename: options.filename,
    callbacks: {
      afterParse(program) {
        for (const node of program.body) {
          if (node.type === 'ImportDeclaration') {
            // This is a very basic way to reconstruct the import statement.
            // It might not cover all edge cases.
            let importString = 'import ';
            if (node.specifiers.length > 0) {
              const defaultSpecifier = node.specifiers.find(
                (s) => s.type === 'ImportDefaultSpecifier'
              );
              const namespaceSpecifier = node.specifiers.find(
                (s) => s.type === 'ImportNamespaceSpecifier'
              );
              const namedSpecifiers = node.specifiers.filter((s) => s.type === 'ImportSpecifier');

              if (defaultSpecifier) {
                importString += defaultSpecifier.local.value;
                if (namedSpecifiers.length > 0 || namespaceSpecifier) {
                  importString += ', ';
                }
              }

              if (namespaceSpecifier) {
                importString += `* as ${namespaceSpecifier.local.value}`;
              }

              if (namedSpecifiers.length > 0) {
                importString += `{ ${namedSpecifiers
                  .map((s) => {
                    if (s.type === 'ImportSpecifier' && s.imported) {
                      return `${s.imported.value} as ${s.local.value}`;
                    }
                    return s.local.value;
                  })
                  .join(', ')} }`;
              }
              importString += ` from '${node.source.value}';`;
            } else {
              importString += `\'${node.source.value}\';`;
            }
            imports.push(importString);
          }
        }
        return program;
      },
    },
  };

  try {
    transformSync(code, swcOptions);
  } catch (_e) {
    // Ignore errors, as we only care about parsing imports
  }

  return imports;
}
