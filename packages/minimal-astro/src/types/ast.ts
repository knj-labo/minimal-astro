/**
 * AST Types for Minimal Astro
 * Defines the structure of the Abstract Syntax Tree
 * Based on existing codebase structure
 */

// ============================================================================
// CORE TYPES - Compatible with existing code
// ============================================================================

export interface Position {
	readonly line: number;
	readonly column: number;
	readonly offset: number;
}

export interface SourceSpan {
	readonly start: Position;
	readonly end: Position;
}

// Legacy alias for compatibility
export type Location = SourceSpan;

export interface BaseNode {
	readonly type: string;
	readonly loc: SourceSpan;
}

// ============================================================================
// DIAGNOSTIC TYPES
// ============================================================================

export interface Diagnostic {
	readonly code: string;
	readonly message: string;
	readonly loc: SourceSpan;
	readonly severity: "error" | "warning" | "info";
}

// ============================================================================
// ATTRIBUTES - Compatible with existing code
// ============================================================================

export interface Attr {
	readonly name: string;
	readonly value?: string | null;
	readonly directive?: ClientDirective;
}

export type ClientDirective = 
	| "load"
	| "idle" 
	| "visible"
	| "media"
	| "only";

// ============================================================================
// NODES - Compatible with existing code structure
// ============================================================================

export interface FragmentNode extends BaseNode {
	readonly type: "Fragment";
	readonly children: Node[];
}

export interface FrontmatterNode extends BaseNode {
	readonly type: "Frontmatter";
	readonly code: string;
	readonly lang?: string;
}

export interface ComponentNode extends BaseNode {
	readonly type: "Component";
	readonly tag: string;
	readonly attrs: Attr[];
	readonly children: Node[];
	readonly selfClosing: boolean;
	// Also provide attributes alias for newer code
	readonly attributes: Attr[];
}

export interface ElementNode extends BaseNode {
	readonly type: "Element";
	readonly tag: string;
	readonly attrs: Attr[];
	readonly children: Node[];
	readonly selfClosing: boolean;
	// Also provide attributes alias for newer code
	readonly attributes: Attr[];
}

export interface TextNode extends BaseNode {
	readonly type: "Text";
	readonly value: string;
	// Also provide content alias for newer code
	readonly content: string;
}

export interface ExpressionNode extends BaseNode {
	readonly type: "Expression";
	readonly code: string;
}

export interface CommentNode extends BaseNode {
	readonly type: "Comment";
	readonly content: string;
}

// ============================================================================
// UNION TYPES
// ============================================================================

export type Node = 
	| FragmentNode
	| FrontmatterNode
	| ComponentNode
	| ElementNode
	| TextNode
	| ExpressionNode
	| CommentNode;

// Legacy alias
export type AstroNode = Node;

// ============================================================================
// PARSE RESULT
// ============================================================================

export interface ParseResult {
	readonly ast: FragmentNode;
	readonly diagnostics: Diagnostic[];
}

// ============================================================================
// VISITOR PATTERN
// ============================================================================

export interface Visitor<T = void> {
	Fragment?(node: FragmentNode): T;
	Frontmatter?(node: FrontmatterNode): T;
	Component?(node: ComponentNode): T;
	Element?(node: ElementNode): T;
	Text?(node: TextNode): T;
	Expression?(node: ExpressionNode): T;
	Comment?(node: CommentNode): T;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type NodeType = Node["type"];
export type NodeWithChildren = ComponentNode | ElementNode | FragmentNode;
export type LeafNode = TextNode | ExpressionNode | CommentNode;