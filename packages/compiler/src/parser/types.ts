export interface AstroAST {
  type: 'Program'
  children: AstroNode[]
}

export type AstroNode = AstroAST | FrontmatterNode | ElementNode | TextNode | ExpressionNode

export interface FrontmatterNode {
  type: 'Frontmatter'
  value: string
}

export interface ElementNode {
  type: 'Element'
  name: string
  attributes: Array<{
    name: string
    value: string | ExpressionNode
  }>
  children: AstroNode[]
  selfClosing: boolean
}

export interface TextNode {
  type: 'Text'
  value: string
}

export interface ExpressionNode {
  type: 'Expression'
  value: string
}
