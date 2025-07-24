/**
 * AST Types for Minimal Astro
 * Defines the structure of the Abstract Syntax Tree
 * Based on existing codebase structure
 */
export interface Position {
    readonly line: number;
    readonly column: number;
    readonly offset: number;
}
export interface SourceSpan {
    readonly start: Position;
    readonly end: Position;
}
export type Location = SourceSpan;
export interface BaseNode {
    readonly type: string;
    readonly loc: SourceSpan;
}
export interface Diagnostic {
    readonly code: string;
    readonly message: string;
    readonly loc: SourceSpan;
    readonly severity: 'error' | 'warning' | 'info';
}
export interface Attr {
    readonly name: string;
    readonly value?: string | boolean | null;
    readonly directive?: ClientDirective;
    readonly loc?: SourceSpan;
}
export type ClientDirective = 'load' | 'idle' | 'visible' | 'media' | 'only';
export interface FragmentNode extends BaseNode {
    readonly type: 'Fragment';
    readonly children: Node[];
}
export interface FrontmatterNode extends BaseNode {
    readonly type: 'Frontmatter';
    readonly code: string;
    readonly lang?: string;
}
export interface ComponentNode extends BaseNode {
    readonly type: 'Component';
    readonly tag: string;
    readonly attrs: Attr[];
    readonly children: Node[];
    readonly selfClosing: boolean;
    readonly attributes: Attr[];
}
export interface ElementNode extends BaseNode {
    readonly type: 'Element';
    readonly tag: string;
    readonly attrs: Attr[];
    readonly children: Node[];
    readonly selfClosing: boolean;
    readonly attributes: Attr[];
}
export interface TextNode extends BaseNode {
    readonly type: 'Text';
    readonly value: string;
    readonly content: string;
}
export interface ExpressionNode extends BaseNode {
    readonly type: 'Expression';
    readonly code: string;
}
export interface CommentNode extends BaseNode {
    readonly type: 'Comment';
    readonly content: string;
}
export interface RawHTMLNode extends BaseNode {
    readonly type: 'RawHTML';
    readonly value: string;
}
export type Node = FragmentNode | FrontmatterNode | ComponentNode | ElementNode | TextNode | ExpressionNode | CommentNode | RawHTMLNode;
export type AstroNode = Node;
export interface ParseResult {
    readonly ast: FragmentNode;
    readonly diagnostics: Diagnostic[];
}
export interface Visitor<T = void> {
    Fragment?(node: FragmentNode): T;
    Frontmatter?(node: FrontmatterNode): T;
    Component?(node: ComponentNode): T;
    Element?(node: ElementNode): T;
    Text?(node: TextNode): T;
    Expression?(node: ExpressionNode): T;
    Comment?(node: CommentNode): T;
}
export type NodeType = Node['type'];
export type NodeWithChildren = ComponentNode | ElementNode | FragmentNode;
export type LeafNode = TextNode | ExpressionNode | CommentNode;
//# sourceMappingURL=ast.d.ts.map