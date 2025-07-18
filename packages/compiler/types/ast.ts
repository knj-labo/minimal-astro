export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface SourceSpan {
  start: Position;
  end: Position;
}

export interface BaseNode {
  type: string;
  loc: SourceSpan;
}

export interface FragmentNode extends BaseNode {
  type: 'Fragment';
  children: Node[];
}

export interface FrontmatterNode extends BaseNode {
  type: 'Frontmatter';
  code: string;
}

export interface ElementNode extends BaseNode {
  type: 'Element';
  tag: string;
  attrs: Attr[];
  children: Node[];
  selfClosing: boolean;
}

export interface ComponentNode extends BaseNode {
  type: 'Component';
  tag: string;
  attrs: Attr[];
  children: Node[];
  selfClosing: boolean;
}

export interface TextNode extends BaseNode {
  type: 'Text';
  value: string;
}

export interface ExpressionNode extends BaseNode {
  type: 'Expression';
  code: string;
  incomplete?: boolean;
}

export interface Attr {
  name: string;
  value: string | boolean;
  loc: SourceSpan;
}

export type Node =
  | FragmentNode
  | FrontmatterNode
  | ElementNode
  | ComponentNode
  | TextNode
  | ExpressionNode;

export interface Diagnostic {
  code: string;
  message: string;
  loc: SourceSpan;
  severity: 'error' | 'warning';
}

export interface ParseResult {
  ast: FragmentNode;
  diagnostics: Diagnostic[];
}