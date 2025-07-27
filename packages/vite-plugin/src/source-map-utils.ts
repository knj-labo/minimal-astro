/**
 * Source map utilities using magic-string for production-ready source map generation
 */

import MagicString from 'magic-string';
import type { SourceMap } from 'magic-string';

export interface SourceMapTransformer {
  overwrite(start: number, end: number, content: string): SourceMapTransformer;
  append(content: string): SourceMapTransformer;
  prepend(content: string): SourceMapTransformer;
  remove(start: number, end: number): SourceMapTransformer;
  toString(): string;
  generateMap(options?: {
    includeContent?: boolean;
    hires?: boolean;
  }): SourceMap;
  getResult(): { code: string; map: SourceMap };
}

/**
 * Create a source map transformer using factory pattern instead of class
 */
export function createSourceMapTransformer(source: string, filename: string): SourceMapTransformer {
  const magicString = new MagicString(source, { filename });

  const transformer: SourceMapTransformer = {
    overwrite(start: number, end: number, content: string) {
      magicString.overwrite(start, end, content);
      return transformer;
    },

    append(content: string) {
      magicString.append(content);
      return transformer;
    },

    prepend(content: string) {
      magicString.prepend(content);
      return transformer;
    },

    remove(start: number, end: number) {
      magicString.remove(start, end);
      return transformer;
    },

    toString() {
      return magicString.toString();
    },

    generateMap(options) {
      return magicString.generateMap({
        source: filename,
        file: filename,
        includeContent: options?.includeContent ?? true,
        hires: options?.hires ?? false,
      });
    },

    getResult() {
      return {
        code: transformer.toString(),
        map: transformer.generateMap(),
      };
    },
  };

  return transformer;
}
