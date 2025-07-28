/**
 * AST (Abstract Syntax Tree) type definitions for Astro templates
 *
 * These types represent the structure of parsed .astro files,
 * converting raw tokens into a hierarchical tree structure.
 *
 * @module ast
 */
/**
 * Type guard to check if a node is an AstroAST (Program) node
 */
export function isAstroAST(node) {
  return node.type === 'Program'
}
/**
 * Type guard to check if a node is a FrontmatterNode
 */
export function isFrontmatterNode(node) {
  return node.type === 'Frontmatter'
}
/**
 * Type guard to check if a node is a TemplateNode
 */
export function isTemplateNode(node) {
  return node.type === 'Template'
}
/**
 * Type guard to check if a node is an ElementNode
 */
export function isElementNode(node) {
  return node.type === 'Element'
}
/**
 * Type guard to check if a node is a TextNode
 */
export function isTextNode(node) {
  return node.type === 'Text'
}
/**
 * Type guard to check if a node is an ExpressionNode
 */
export function isExpressionNode(node) {
  return node.type === 'Expression'
}
//# sourceMappingURL=ast.js.map
