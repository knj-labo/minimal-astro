import * as acorn from 'acorn';

// Basic and safe expression evaluator
export function evaluateExpression(expression: string, context: Record<string, any>): any {
  try {
    const ast = acorn.parse(expression, { ecmaVersion: 2022, sourceType: 'script' });

    // Very basic AST walker
    function evaluateNode(node: any): any {
      switch (node.type) {
        case 'Program':
          return evaluateNode(node.body[0]);
        case 'ExpressionStatement':
          return evaluateNode(node.expression);
        case 'Literal':
          return node.value;
        case 'Identifier':
          if (node.name in context) {
            return context[node.name];
          }
          throw new Error(`Undefined variable: ${node.name}`);
        case 'MemberExpression': {
          const object = evaluateNode(node.object);
          if (node.computed) {
            const property = evaluateNode(node.property);
            return object[property];
          }
          return object[node.property.name];
        }
        case 'BinaryExpression': {
          const left = evaluateNode(node.left);
          const right = evaluateNode(node.right);
          switch (node.operator) {
            case '+':
              return left + right;
            case '-':
              return left - right;
            case '*':
              return left * right;
            case '/':
              return left / right;
            case '==':
              return left === right;
            case '!=':
              return left !== right;
            case '===':
              return left === right;
            case '!==':
              return left !== right;
            case '<':
              return left < right;
            case '<=':
              return left <= right;
            case '>':
              return left > right;
            case '>=':
              return left >= right;
            default:
              throw new Error(`Unsupported operator: ${node.operator}`);
          }
        }
        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }
    }

    return evaluateNode(ast);
  } catch (error) {
    console.error('Failed to evaluate expression:', error);
    return undefined;
  }
}

export function extractVariables(code: string): Record<string, unknown> {
  const variables: Record<string, unknown> = {};
  try {
    const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
    for (const node of ast.body) {
      if (node.type === 'VariableDeclaration') {
        for (const declaration of node.declarations) {
          if (declaration.id.type === 'Identifier') {
            variables[declaration.id.name] = undefined; // We just need the names
          }
        }
      }
    }
  } catch (_e) {
    // Ignore parsing errors
  }
  return variables;
}
