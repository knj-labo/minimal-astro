import type { SourceSpan } from '@minimal-astro/types/ast';
export declare enum TokenType {
    Text = "Text",
    TagOpen = "TagOpen",
    TagClose = "TagClose",
    TagSelfClose = "TagSelfClose",
    AttributeName = "AttributeName",
    AttributeValue = "AttributeValue",
    ExpressionStart = "ExpressionStart",
    ExpressionEnd = "ExpressionEnd",
    ExpressionContent = "ExpressionContent",
    FrontmatterStart = "FrontmatterStart",
    FrontmatterEnd = "FrontmatterEnd",
    FrontmatterContent = "FrontmatterContent",
    EOF = "EOF"
}
export interface Token {
    type: TokenType;
    value: string;
    loc: SourceSpan;
}
export declare enum Mode {
    HTML = "HTML",
    Expression = "Expression",
    Frontmatter = "Frontmatter",
    Tag = "Tag",
    Attribute = "Attribute",
    Style = "Style",
    Script = "Script"
}
export declare function tokenize(source: string): Token[];
export declare function tokenizeLegacy(source: string): Token[];
//# sourceMappingURL=tokenizer.d.ts.map