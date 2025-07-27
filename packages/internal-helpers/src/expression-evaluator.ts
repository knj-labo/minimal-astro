/**
 * CSP-compliant expression evaluator without eval or new Function
 * Simple implementation that supports basic operations
 *
 * @module expression-evaluator
 */

/**
 * Context object containing variables for expression evaluation
 * @interface EvaluatorContext
 */
export interface EvaluatorContext {
  [key: string]: unknown;
}

/**
 * Evaluates a JavaScript expression without using eval() or new Function()
 * Uses recursive descent parsing for CSP compliance
 *
 * @param {string} expression - The expression to evaluate
 * @param {EvaluatorContext} context - Variables available during evaluation
 * @returns {any} The result of the expression evaluation
 *
 * @example
 * evaluateExpression('a + b', { a: 1, b: 2 }) // returns 3
 * evaluateExpression('user.name', { user: { name: 'John' } }) // returns 'John'
 * evaluateExpression('x > 5 ? "yes" : "no"', { x: 10 }) // returns 'yes'
 *
 * @supports
 * - Property access: obj.prop, obj['prop']
 * - Arithmetic: +, -, *, /, %
 * - Comparison: ==, ===, !=, !==, <, >, <=, >=
 * - Logical: &&, ||, !
 * - Ternary: condition ? true : false
 * - Literals: numbers, strings, booleans, null, undefined
 */
export function evaluateExpression(expression: string, context: EvaluatorContext = {}): unknown {
  let position = 0;

  type SafeMethod = (...args: unknown[]) => unknown;

  function parseExpression(): unknown {
    return parseTernary();
  }

  function parseTernary(): unknown {
    const condition = parseLogicalOr();

    if (consume('?')) {
      const trueValue = parseTernary();
      expect(':');
      const falseValue = parseTernary();
      return condition ? trueValue : falseValue;
    }

    return condition;
  }

  function parseLogicalOr(): unknown {
    let left = parseLogicalAnd();

    while (consume('||')) {
      const right = parseLogicalAnd();
      left = left || right;
    }

    return left;
  }

  function parseLogicalAnd(): unknown {
    let left = parseEquality();

    while (consume('&&')) {
      const right = parseEquality();
      left = left && right;
    }

    return left;
  }

  function parseEquality(): unknown {
    let left = parseComparison();

    while (true) {
      if (consume('===')) {
        left = left === parseComparison();
      } else if (consume('!==')) {
        left = left !== parseComparison();
      } else if (consume('==')) {
        // biome-ignore lint/suspicious/noDoubleEquals: Supporting JS == operator
        left = left == parseComparison();
      } else if (consume('!=')) {
        // biome-ignore lint/suspicious/noDoubleEquals: Supporting JS != operator
        left = left != parseComparison();
      } else {
        break;
      }
    }

    return left;
  }

  function parseComparison(): unknown {
    let left = parseAdditive();

    while (true) {
      if (consume('<=')) {
        left = left <= parseAdditive();
      } else if (consume('>=')) {
        left = left >= parseAdditive();
      } else if (consume('<')) {
        left = left < parseAdditive();
      } else if (consume('>')) {
        left = left > parseAdditive();
      } else {
        break;
      }
    }

    return left;
  }

  function parseAdditive(): unknown {
    let left = parseMultiplicative();

    while (true) {
      if (consume('+')) {
        left = left + parseMultiplicative();
      } else if (consume('-')) {
        left = left - parseMultiplicative();
      } else {
        break;
      }
    }

    return left;
  }

  function parseMultiplicative(): unknown {
    let left = parseUnary();

    while (true) {
      if (consume('*')) {
        left = left * parseUnary();
      } else if (consume('/')) {
        left = left / parseUnary();
      } else if (consume('%')) {
        left = left % parseUnary();
      } else {
        break;
      }
    }

    return left;
  }

  function parseUnary(): unknown {
    if (consume('!')) {
      return !parseUnary();
    }
    if (consume('-')) {
      return -parseUnary();
    }
    if (consume('+')) {
      return +parseUnary();
    }

    return parsePostfix();
  }

  function parsePostfix(): unknown {
    let value = parsePrimary();

    while (true) {
      if (consume('.')) {
        const property = parseIdentifier();
        value = value == null ? undefined : (value as Record<string, unknown>)[property];
      } else if (consume('[')) {
        const index = parseExpression();
        expect(']');
        value =
          value == null
            ? undefined
            : (value as Record<string | number, unknown>)[index as string | number];
      } else if (consume('(')) {
        // Simple method calls for safe built-in methods
        const args: unknown[] = [];
        while (!peek(')')) {
          args.push(parseExpression());
          if (!consume(',')) break;
        }
        expect(')');

        if (typeof value === 'function' && isSafeMethod(value as SafeMethod)) {
          value = (value as SafeMethod)(...args);
        } else {
          throw new Error('Function calls not allowed');
        }
      } else {
        break;
      }
    }

    return value;
  }

  function parsePrimary(): unknown {
    skipWhitespace();

    // Numbers
    if (/\d/.test(currentChar())) {
      let num = '';
      while (/[\d.]/.test(currentChar())) {
        num += currentChar();
        position++;
      }
      return Number.parseFloat(num);
    }

    // Strings
    if (currentChar() === '"' || currentChar() === "'") {
      const quote = currentChar();
      position++;
      let str = '';
      while (currentChar() !== quote && position < expression.length) {
        if (currentChar() === '\\') {
          position++;
          const escaped = currentChar();
          switch (escaped) {
            case 'n':
              str += '\n';
              break;
            case 't':
              str += '\t';
              break;
            case 'r':
              str += '\r';
              break;
            case '\\':
              str += '\\';
              break;
            case quote:
              str += quote;
              break;
            default:
              str += escaped;
          }
        } else {
          str += currentChar();
        }
        position++;
      }
      position++; // Skip closing quote
      return str;
    }

    // Booleans and null
    if (consume('true')) return true;
    if (consume('false')) return false;
    if (consume('null')) return null;
    if (consume('undefined')) return undefined;

    // Parentheses
    if (consume('(')) {
      const value = parseExpression();
      expect(')');
      return value;
    }

    // Identifiers
    const id = parseIdentifier();
    if (id) {
      return context[id];
    }

    throw new Error(`Unexpected character: ${currentChar()}`);
  }

  function parseIdentifier(): string {
    skipWhitespace();
    let id = '';
    while (/[a-zA-Z0-9_$]/.test(currentChar())) {
      id += currentChar();
      position++;
    }
    return id;
  }

  function currentChar(): string {
    return expression[position] || '';
  }

  function peek(str: string): boolean {
    skipWhitespace();
    return expression.substring(position, position + str.length) === str;
  }

  function consume(str: string): boolean {
    skipWhitespace();
    if (expression.substring(position, position + str.length) === str) {
      position += str.length;
      return true;
    }
    return false;
  }

  function expect(str: string): void {
    if (!consume(str)) {
      throw new Error(`Expected ${str}`);
    }
  }

  function skipWhitespace(): void {
    while (/\s/.test(currentChar())) {
      position++;
    }
  }

  function isSafeMethod(func: SafeMethod): boolean {
    // Only allow specific safe methods
    const safeMethods = [
      String.prototype.toString,
      String.prototype.toLowerCase,
      String.prototype.toUpperCase,
      String.prototype.trim,
      Array.prototype.join,
      Number.prototype.toString,
      Number.prototype.toFixed,
    ] as SafeMethod[];
    return safeMethods.includes(func);
  }

  try {
    return parseExpression();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[expression-evaluator] Failed to evaluate:', expression, error);
    }
    return undefined;
  }
}

/**
 * Extracts variable names from JavaScript/TypeScript code
 * Currently only supports const, let, and var declarations
 *
 * @param {string} code - The code to analyze
 * @returns {string[]} Array of variable names found
 *
 * @example
 * extractVariables('const foo = 1; let bar = 2;') // returns ['foo', 'bar']
 *
 * @todo Support destructuring assignments
 * @todo Support function parameters
 */
export function extractVariables(code: string): string[] {
  const variables: string[] = [];
  const varRegex = /(?:const|let|var)\s+(\w+)/g;
  let match: RegExpExecArray | null = varRegex.exec(code);

  while (match !== null) {
    variables.push(match[1]);
    match = varRegex.exec(code);
  }

  return variables;
}
