import { type Options, transformSync } from '@swc/core';

export interface StripTypeScriptOptions {
  jsx?: boolean;
  filename?: string;
}

export function stripTypeScriptWithSwc(code: string, options: StripTypeScriptOptions): string {
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

export function extractImportsWithSwc(code: string, options: StripTypeScriptOptions): string[] {
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
        program.body.forEach((node) => {
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
        });
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
