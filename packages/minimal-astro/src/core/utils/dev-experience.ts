/**
 * Development experience enhancements for minimal-astro
 * Provides better error messages, suggestions, and debugging aids
 */

import { createContextualLogger } from './logger.js';

const logger = createContextualLogger({ module: 'dev-experience' });

export interface ErrorEnhancement {
  originalError: Error;
  enhancedMessage: string;
  suggestions: string[];
  documentation?: string;
  codeFrame?: string;
}

export interface CodeContext {
  source: string;
  filename?: string;
  line?: number;
  column?: number;
}

/**
 * Enhanced error message patterns and their improvements
 */
const errorPatterns: Array<{
  pattern: RegExp;
  enhance: (match: RegExpMatchArray, error: Error) => Omit<ErrorEnhancement, 'originalError'>;
}> = [
  {
    pattern: /Unexpected token.*at position (\d+)/,
    enhance: (match, _error) => ({
      enhancedMessage: `Parse error: Unexpected syntax at position ${match[1]}`,
      suggestions: [
        'Check for missing closing tags or brackets',
        'Verify that all expressions are properly wrapped in { }',
        'Ensure frontmatter is properly delimited with ---',
      ],
      documentation: 'https://docs.astro.build/en/core-concepts/astro-syntax/',
    }),
  },

  {
    pattern: /Component.*not found/i,
    enhance: (_match, error) => ({
      enhancedMessage: `Component import error: ${error.message}`,
      suggestions: [
        'Check if the component file exists',
        'Verify the import path is correct',
        'Ensure the component is properly exported',
        'Check for typos in the component name',
      ],
      documentation: 'https://docs.astro.build/en/core-concepts/astro-components/',
    }),
  },

  {
    pattern: /client:(\w+)/i,
    enhance: (match, _error) => ({
      enhancedMessage: `Client directive error: Issue with client:${match[1]}`,
      suggestions: [
        'Verify the client directive is supported',
        'Check that the component can be hydrated',
        'Ensure the framework is properly configured',
        'Available directives: client:load, client:idle, client:visible, client:media',
      ],
      documentation:
        'https://docs.astro.build/en/reference/directives-reference/#client-directives',
    }),
  },

  {
    pattern: /Failed to.*frontmatter/i,
    enhance: (_match, error) => ({
      enhancedMessage: `Frontmatter parsing error: ${error.message}`,
      suggestions: [
        'Check that frontmatter is valid JavaScript/TypeScript',
        'Ensure frontmatter is delimited with --- at start and end',
        'Verify all imports and variable declarations are correct',
        'Check for syntax errors in the frontmatter block',
      ],
      documentation:
        'https://docs.astro.build/en/core-concepts/astro-components/#the-component-script',
    }),
  },

  {
    pattern: /Validation.*failed/i,
    enhance: (_match, error) => ({
      enhancedMessage: `Content validation error: ${error.message}`,
      suggestions: [
        'Check the content schema definition',
        'Verify all required fields are present',
        'Ensure data types match the schema',
        'Review the content file structure',
      ],
      documentation: 'https://docs.astro.build/en/guides/content-collections/',
    }),
  },
];

/**
 * Enhance an error with better messaging and suggestions
 */
export function enhanceError(error: Error, context?: CodeContext): ErrorEnhancement {
  let enhancement: Omit<ErrorEnhancement, 'originalError'> = {
    enhancedMessage: error.message,
    suggestions: [],
  };

  // Try to match against known patterns
  for (const pattern of errorPatterns) {
    const match = error.message.match(pattern.pattern);
    if (match) {
      enhancement = pattern.enhance(match, error);
      break;
    }
  }

  // Add code frame if context is available
  if (context?.source && context.line !== undefined) {
    enhancement.codeFrame = generateCodeFrame(context);
  }

  return {
    originalError: error,
    ...enhancement,
  };
}

/**
 * Generate a helpful code frame showing the error location
 */
export function generateCodeFrame(context: CodeContext): string {
  const { source, line = 1, column = 1 } = context;
  const lines = source.split('\n');

  if (line < 1 || line > lines.length) {
    return '';
  }

  const startLine = Math.max(1, line - 2);
  const endLine = Math.min(lines.length, line + 2);
  const frame: string[] = [];

  for (let i = startLine; i <= endLine; i++) {
    const lineNumber = i.toString().padStart(3, ' ');
    const isErrorLine = i === line;
    const lineContent = lines[i - 1] || '';

    if (isErrorLine) {
      frame.push(`> ${lineNumber} | ${lineContent}`);
      if (column > 1) {
        const pointer = `${' '.repeat(lineNumber.length + 3 + column - 1)}^`;
        frame.push(pointer);
      }
    } else {
      frame.push(`  ${lineNumber} | ${lineContent}`);
    }
  }

  return frame.join('\n');
}

/**
 * Format an enhanced error for display
 */
export function formatEnhancedError(enhancement: ErrorEnhancement): string {
  const parts: string[] = [];

  parts.push(`Error: ${enhancement.enhancedMessage}`);

  if (enhancement.codeFrame) {
    parts.push('');
    parts.push(enhancement.codeFrame);
  }

  if (enhancement.suggestions.length > 0) {
    parts.push('');
    parts.push('Suggestions:');
    for (const suggestion of enhancement.suggestions) {
      parts.push(`   • ${suggestion}`);
    }
  }

  if (enhancement.documentation) {
    parts.push('');
    parts.push(`Documentation: ${enhancement.documentation}`);
  }

  return parts.join('\n');
}

/**
 * Development-friendly error handler
 */
export function createDevErrorHandler(isDev = true) {
  return (error: Error, context?: CodeContext) => {
    if (!isDev) {
      // In production, just log the basic error
      logger.error('Runtime error', error);
      return;
    }

    // In development, provide enhanced error information
    const enhancement = enhanceError(error, context);
    const formatted = formatEnhancedError(enhancement);

    console.error(`\n${formatted}\n`);

    // Also log to our structured logger
    logger.error('Enhanced development error', error, {
      filename: context?.filename,
      line: context?.line,
      column: context?.column,
      suggestions: enhancement.suggestions,
    });
  };
}

/**
 * Validate common development issues
 */
export function validateDevelopmentSetup(): Array<{
  issue: string;
  fix: string;
}> {
  const issues: Array<{ issue: string; fix: string }> = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    issues.push({
      issue: `Node.js version ${nodeVersion} is not supported`,
      fix: 'Upgrade to Node.js 18 or later',
    });
  }

  // Check for common missing dependencies
  try {
    require.resolve('vite');
  } catch {
    issues.push({
      issue: 'Vite dependency not found',
      fix: 'Install vite: npm install vite',
    });
  }

  return issues;
}

/**
 * Performance hints for development
 */
export function getPerformanceHints(): Array<{
  hint: string;
  benefit: string;
}> {
  return [
    {
      hint: 'Use static imports instead of dynamic imports when possible',
      benefit: 'Better bundling and faster builds',
    },
    {
      hint: 'Minimize the use of client:load directives',
      benefit: 'Reduced JavaScript bundle size and faster page loads',
    },
    {
      hint: 'Use content collections for structured data',
      benefit: 'Better type safety and performance',
    },
    {
      hint: 'Enable source maps in development',
      benefit: 'Easier debugging of transformed code',
    },
    {
      hint: 'Use object pooling for frequently created objects',
      benefit: 'Reduced garbage collection overhead',
    },
  ];
}

/**
 * Debug information collector
 */
export function collectDebugInfo() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      ASTRO_LOG_LEVEL: process.env.ASTRO_LOG_LEVEL,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a development-friendly function wrapper
 */
export function withDevEnhancements<T extends unknown[], R>(
  fn: (...args: T) => R,
  _operation: string,
  filename?: string
) {
  const devErrorHandler = createDevErrorHandler(process.env.NODE_ENV === 'development');

  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (error) {
      devErrorHandler(error instanceof Error ? error : new Error(String(error)), {
        source: '',
        filename,
      });
      throw error;
    }
  };
}
