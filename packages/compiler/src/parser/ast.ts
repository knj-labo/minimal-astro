/**
 * AST (Abstract Syntax Tree) type definitions for Astro templates
 *
 * These types represent the structure of parsed .astro files,
 * converting raw tokens into a hierarchical tree structure.
 *
 * @module ast
 */

/**
 * The root node of an Astro AST
 *
 * Represents the entire parsed .astro file as a program containing
 * multiple top-level nodes (frontmatter, elements, etc.)
 *
 * @example
 * ```typescript
 * const ast: AstroAST = {
 *   type: 'Program',
 *   children: [frontmatterNode, elementNode]
 * }
 * ```
 */
export interface AstroAST {
  /** Node type identifier */
  type: 'Program'
  /** Array of top-level child nodes */
  children: AstroNode[]
}

/**
 * Union type representing all possible AST node types
 *
 * This type encompasses all nodes that can appear in an Astro AST,
 * including the root program node and all child node types.
 */
export type AstroNode =
  | AstroAST
  | FrontmatterNode
  | TemplateNode
  | ElementNode
  | TextNode
  | ExpressionNode

/**
 * Represents the frontmatter section of an Astro file
 *
 * Frontmatter is JavaScript/TypeScript code enclosed in --- markers
 * at the beginning of an .astro file. It's executed at build time.
 *
 * @example
 * ```astro
 * ---
 * const title = 'My Page'
 * import Layout from './Layout.astro'
 * ---
 * ```
 */
export interface FrontmatterNode {
  /** Node type identifier */
  type: 'Frontmatter'
  /** The JavaScript/TypeScript code content */
  value: string
}

/**
 * Represents the template body of an Astro file
 *
 * The template node contains all content after the frontmatter,
 * including HTML elements, components, and expressions.
 * This is a container node that groups all template content.
 */
export interface TemplateNode {
  /** Node type identifier */
  type: 'Template'
  /** Child nodes within the template */
  children: AstroNode[]
}

/**
 * Represents an HTML element or Astro component
 *
 * This node type covers both standard HTML elements (div, span, etc.)
 * and Astro components (both .astro components and framework components).
 *
 * @example
 * ```astro
 * <div class="container" id={dynamicId}>
 *   <h1>Hello</h1>
 * </div>
 * ```
 */
export interface ElementNode {
  /** Node type identifier */
  type: 'Element'
  /** Element or component name (e.g., 'div', 'Button', 'Layout') */
  name: string
  /** Array of element attributes */
  attributes: Array<{
    /** Attribute name */
    name: string
    /** Attribute value (can be static string or dynamic expression) */
    value: string | ExpressionNode
  }>
  /** Child nodes nested within this element */
  children: AstroNode[]
  /** Whether the element is self-closing (e.g., <img />) */
  selfClosing: boolean
}

/**
 * Represents plain text content
 *
 * Text nodes contain literal text that appears between elements
 * or within elements. Whitespace is preserved.
 *
 * @example
 * ```astro
 * <p>This is a text node</p>
 * ```
 */
export interface TextNode {
  /** Node type identifier */
  type: 'Text'
  /** The text content */
  value: string
}

/**
 * Represents a JavaScript expression in the template
 *
 * Expressions are JavaScript code wrapped in curly braces {}
 * that get evaluated and rendered in the template.
 *
 * @example
 * ```astro
 * <div>{count * 2}</div>
 * <p>{user.name}</p>
 * ```
 */
export interface ExpressionNode {
  /** Node type identifier */
  type: 'Expression'
  /** The JavaScript expression code */
  value: string
}

/**
 * Type guard to check if a node is an AstroAST (Program) node
 */
export function isAstroAST(node: AstroNode): node is AstroAST {
  return node.type === 'Program'
}

/**
 * Type guard to check if a node is a FrontmatterNode
 */
export function isFrontmatterNode(node: AstroNode): node is FrontmatterNode {
  return node.type === 'Frontmatter'
}

/**
 * Type guard to check if a node is a TemplateNode
 */
export function isTemplateNode(node: AstroNode): node is TemplateNode {
  return node.type === 'Template'
}

/**
 * Type guard to check if a node is an ElementNode
 */
export function isElementNode(node: AstroNode): node is ElementNode {
  return node.type === 'Element'
}

/**
 * Type guard to check if a node is a TextNode
 */
export function isTextNode(node: AstroNode): node is TextNode {
  return node.type === 'Text'
}

/**
 * Type guard to check if a node is an ExpressionNode
 */
export function isExpressionNode(node: AstroNode): node is ExpressionNode {
  return node.type === 'Expression'
}
