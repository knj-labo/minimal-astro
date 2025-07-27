export interface Token {
  type: TokenType
  value: string
  line: number
  col: number
}

export type TokenType =
  | 'FRONTMATTER_START'
  | 'FRONTMATTER_END'
  | 'FRONTMATTER_CONTENT'
  | 'HTML_TAG_OPEN'
  | 'HTML_TAG_CLOSE'
  | 'HTML_TAG_SELF_CLOSE'
  | 'HTML_TAG_NAME'
  | 'HTML_ATTRIBUTE_NAME'
  | 'HTML_ATTRIBUTE_VALUE'
  | 'EXPRESSION_START'
  | 'EXPRESSION_END'
  | 'EXPRESSION_CONTENT'
  | 'TEXT'
  | 'WHITESPACE'
  | 'EOF'
