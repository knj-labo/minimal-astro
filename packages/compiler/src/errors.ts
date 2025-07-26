import type { SourceSpan } from '@minimal-astro/types/ast';
/**
 * Base error class for compiler errors
 */
export class CompilerError extends Error {
  public readonly code: string;
  public readonly loc?: SourceSpan;
  public readonly filename?: string;

  constructor(message: string, code: string, loc?: SourceSpan, filename?: string) {
    super(message);
    this.name = 'CompilerError';
    this.code = code;
    this.loc = loc;
    this.filename = filename;
  }
}

/**
 * Error class for frontmatter parsing errors
 */
export class FrontmatterParseError extends CompilerError {
  constructor(message: string, loc?: SourceSpan, filename?: string) {
    super(message, 'FRONTMATTER_PARSE_ERROR', loc, filename);
    this.name = 'FrontmatterParseError';
  }
}
