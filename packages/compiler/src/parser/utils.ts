import type { AstroAST, AstroNode, ElementNode } from './types.js'

/**
 * Walk handler function type for visiting AST nodes
 */
export type WalkHandler = (
  node: AstroNode,
  parent?: AstroNode,
  prop?: string,
  index?: number,
) => void

/**
 * Async walk handler function type for visiting AST nodes
 */
export type AsyncWalkHandler = (
  node: AstroNode,
  parent?: AstroNode,
  prop?: string,
  index?: number,
) => Promise<void>

/**
 * Walk through the AST synchronously and execute a handler function for each node
 *
 * @param ast - The root node of the AST to traverse
 * @param handler - Handler function to execute for each node
 *
 * @example
 * ```typescript
 * walk(ast, (node) => {
 *   if (is.tag(node)) {
 *     console.log(node.name);
 *   }
 * });
 * ```
 */
export function walk(ast: AstroNode, handler: WalkHandler): void {
  function traverse(node: AstroNode, parent?: AstroNode, prop?: string, index?: number): void {
    handler(node, parent, prop, index)

    // Traverse child nodes
    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach((child, idx) => {
        traverse(child, node, 'children', idx)
      })
    }

    // Traverse Expression nodes within attributes
    if (node.type === 'Element' && node.attributes) {
      node.attributes.forEach((attr, idx) => {
        if (typeof attr.value === 'object' && attr.value.type === 'Expression') {
          traverse(attr.value, node, `attributes[${idx}].value`, idx)
        }
      })
    }
  }

  traverse(ast)
}

/**
 * Walk through the AST asynchronously and execute a handler function for each node
 *
 * @param ast - The root node of the AST to traverse
 * @param handler - Async handler function to execute for each node
 *
 * @example
 * ```typescript
 * await walkAsync(ast, async (node) => {
 *   if (is.tag(node)) {
 *     node.value = await expensiveCalculation(node);
 *   }
 * });
 * ```
 */
export async function walkAsync(ast: AstroNode, handler: AsyncWalkHandler): Promise<void> {
  async function traverse(
    node: AstroNode,
    parent?: AstroNode,
    prop?: string,
    index?: number,
  ): Promise<void> {
    await handler(node, parent, prop, index)

    // Traverse child nodes
    if ('children' in node && Array.isArray(node.children)) {
      for (let idx = 0; idx < node.children.length; idx++) {
        await traverse(node.children[idx], node, 'children', idx)
      }
    }

    // Traverse Expression nodes within attributes
    if (node.type === 'Element' && node.attributes) {
      for (let idx = 0; idx < node.attributes.length; idx++) {
        const attr = node.attributes[idx]
        if (typeof attr.value === 'object' && attr.value.type === 'Expression') {
          await traverse(attr.value, node, `attributes[${idx}].value`, idx)
        }
      }
    }
  }

  await traverse(ast)
}

/**
 * Type guard helpers for node type checking
 *
 * @example
 * ```typescript
 * if (is.tag(node)) {
 *   console.log(node.name); // node is inferred as ElementNode
 * }
 * ```
 */
export const is = {
  /**
   * Check if a node is a tag (element) node.
   * Similar to official Astro, represents element/custom-element/component
   *
   * @param node - The AST node to check
   * @returns True if the node is an ElementNode
   *
   * @example
   * ```typescript
   * if (is.tag(node)) {
   *   console.log(node.name); // TypeScript knows node is ElementNode
   * }
   * ```
   */
  tag(node: AstroNode): node is ElementNode {
    return node.type === 'Element'
  },

  /**
   * Check if a node is an element node
   *
   * @param node - The AST node to check
   * @returns True if the node is an ElementNode
   *
   * @example
   * ```typescript
   * if (is.element(node)) {
   *   console.log(node.attributes); // Access element-specific properties
   * }
   * ```
   */
  element(node: AstroNode): node is ElementNode {
    return node.type === 'Element'
  },

  /**
   * Check if a node is a text node
   *
   * @param node - The AST node to check
   * @returns True if the node is a TextNode
   *
   * @example
   * ```typescript
   * if (is.text(node)) {
   *   console.log(node.value); // Access text content
   * }
   * ```
   */
  text(node: AstroNode): node is AstroNode & { type: 'Text' } {
    return node.type === 'Text'
  },

  /**
   * Check if a node is an expression node
   *
   * @param node - The AST node to check
   * @returns True if the node is an ExpressionNode
   *
   * @example
   * ```typescript
   * if (is.expression(node)) {
   *   console.log(node.value); // Access JavaScript expression
   * }
   * ```
   */
  expression(node: AstroNode): node is AstroNode & { type: 'Expression' } {
    return node.type === 'Expression'
  },

  /**
   * Check if a node is a frontmatter node
   *
   * @param node - The AST node to check
   * @returns True if the node is a FrontmatterNode
   *
   * @example
   * ```typescript
   * if (is.frontmatter(node)) {
   *   console.log(node.value); // Access frontmatter code
   * }
   * ```
   */
  frontmatter(node: AstroNode): node is AstroNode & { type: 'Frontmatter' } {
    return node.type === 'Frontmatter'
  },

  /**
   * Check if a node is a program node (root)
   *
   * @param node - The AST node to check
   * @returns True if the node is a ProgramNode
   *
   * @example
   * ```typescript
   * if (is.program(node)) {
   *   console.log(node.children); // Access all top-level nodes
   * }
   * ```
   */
  program(node: AstroNode): node is AstroAST {
    return node.type === 'Program'
  },
}
