import type {
  FragmentNode,
  Node,
  ElementNode,
  ComponentNode,
  TextNode,
  ExpressionNode,
  FrontmatterNode,
  Attr,
  Diagnostic,
  ParseResult,
  SourceSpan,
} from '../types/ast.js';
import { Tokenizer, TokenType, type Token } from './tokenizer.js';

export interface ParseOptions {
  filename?: string;
}

export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private diagnostics: Diagnostic[] = [];
  private filename: string;

  constructor(tokens: Token[], options: ParseOptions = {}) {
    this.tokens = tokens;
    this.filename = options.filename || '<anonymous>';
  }

  private peek(offset: number = 0): Token | null {
    const index = this.current + offset;
    return index < this.tokens.length ? this.tokens[index] : null;
  }

  private advance(): Token | null {
    if (this.current < this.tokens.length) {
      return this.tokens[this.current++];
    }
    return null;
  }

  private isAtEnd(): boolean {
    const token = this.peek();
    return !token || token.type === TokenType.EOF;
  }

  private addDiagnostic(
    code: string,
    message: string,
    loc: SourceSpan,
    severity: 'error' | 'warning' = 'error'
  ): void {
    this.diagnostics.push({
      code,
      message,
      loc,
      severity,
    });
  }

  private isComponentTag(name: string): boolean {
    return /^[A-Z]/.test(name);
  }

  private isVoidElement(tag: string): boolean {
    const voidElements = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];
    return voidElements.includes(tag.toLowerCase());
  }

  private parseAttributes(): Attr[] {
    const attrs: Attr[] = [];
    const seenNames = new Set<string>();

    while (!this.isAtEnd()) {
      const token = this.peek();
      if (!token) break;

      if (token.type === TokenType.TagClose || token.type === TokenType.TagSelfClose) {
        break;
      }

      if (token.type === TokenType.AttributeName) {
        const attrToken = this.advance()!;
        const name = attrToken.value;
        let value: string | boolean = true;

        // Check for duplicate client directives
        if (name.startsWith('client:') && seenNames.has(name)) {
          this.addDiagnostic(
            'duplicate-directive',
            `Duplicate ${name} directive`,
            attrToken.loc,
            'warning'
          );
        }
        seenNames.add(name);

        // Check if next token is an attribute value
        const nextToken = this.peek();
        if (nextToken && nextToken.type === TokenType.AttributeValue) {
          const valueToken = this.advance()!;
          const fullValue = valueToken.value;
          const equalIndex = fullValue.indexOf('=');
          if (equalIndex !== -1) {
            value = fullValue.substring(equalIndex + 1);
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
          }
        }

        attrs.push({
          name,
          value,
          loc: attrToken.loc,
        });
      } else {
        // Skip unknown tokens in tag context
        this.advance();
      }
    }

    return attrs;
  }

  private parseFrontmatter(): FrontmatterNode | null {
    const token = this.peek();
    if (token && token.type === TokenType.FrontmatterContent) {
      this.advance();
      return {
        type: 'Frontmatter',
        code: token.value,
        loc: token.loc,
      };
    }
    return null;
  }

  private parseExpression(): ExpressionNode | null {
    const token = this.peek();
    if (token && token.type === TokenType.ExpressionContent) {
      this.advance();
      
      // Check if expression was marked as incomplete
      let code = token.value;
      let incomplete = false;
      
      if (code.includes('\x00incomplete')) {
        code = code.replace('\x00incomplete', '');
        incomplete = true;
        this.addDiagnostic(
          'unclosed-expression',
          'Unclosed expression',
          token.loc
        );
      }

      return {
        type: 'Expression',
        code,
        loc: token.loc,
        ...(incomplete && { incomplete: true }),
      };
    }
    return null;
  }

  private parseText(): TextNode | null {
    const token = this.peek();
    if (token && token.type === TokenType.Text) {
      this.advance();
      return {
        type: 'Text',
        value: token.value,
        loc: token.loc,
      };
    }
    return null;
  }

  private parseElement(): ElementNode | ComponentNode | null {
    const openToken = this.peek();
    if (!openToken || openToken.type !== TokenType.TagOpen) {
      return null;
    }

    this.advance();
    const tag = openToken.value;
    const isComponent = this.isComponentTag(tag);
    const attrs = this.parseAttributes();
    
    let selfClosing = false;
    let children: Node[] = [];

    const closeToken = this.peek();
    if (closeToken) {
      if (closeToken.type === TokenType.TagSelfClose) {
        this.advance();
        selfClosing = true;
      } else if (closeToken.type === TokenType.TagClose) {
        this.advance();
        
        // Parse children if not self-closing and not void element
        if (!this.isVoidElement(tag)) {
          children = this.parseChildren(tag);
        }
      }
    }

    const endLoc = this.tokens[this.current - 1]?.loc.end || openToken.loc.end;
    const loc: SourceSpan = {
      start: openToken.loc.start,
      end: endLoc,
    };

    if (isComponent) {
      return {
        type: 'Component',
        tag,
        attrs,
        children,
        selfClosing,
        loc,
      };
    } else {
      return {
        type: 'Element',
        tag,
        attrs,
        children,
        selfClosing,
        loc,
      };
    }
  }

  private parseChildren(parentTag: string): Node[] {
    const children: Node[] = [];
    const implicitlyClosedBy = this.getImplicitlyClosedTags(parentTag);

    while (!this.isAtEnd()) {
      const token = this.peek();
      if (!token) break;

      // Check for closing tag
      if (token.type === TokenType.TagClose && token.value === parentTag) {
        this.advance();
        break;
      }

      // Check for mismatched closing tag
      if (token.type === TokenType.TagClose) {
        this.addDiagnostic(
          'mismatched-tag',
          `Expected closing tag for <${parentTag}> but found </${token.value}>`,
          token.loc
        );
        // Try to recover by treating it as if parent was closed
        break;
      }

      // Check for tags that implicitly close the parent (like <li> closing previous <li>)
      if (token.type === TokenType.TagOpen && implicitlyClosedBy.includes(token.value)) {
        // Don't consume the token, let parent handle it
        break;
      }

      const node = this.parseNode();
      if (node) {
        children.push(node);
      } else {
        // Skip unknown tokens
        this.advance();
      }
    }

    // Check if we reached end without closing tag
    if (this.isAtEnd() && !this.isVoidElement(parentTag)) {
      const lastToken = this.tokens[this.tokens.length - 1];
      this.addDiagnostic(
        'unclosed-tag',
        `Unclosed tag <${parentTag}>`,
        lastToken?.loc || { 
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 }
        }
      );
    }

    return children;
  }

  private getImplicitlyClosedTags(tag: string): string[] {
    // HTML tags that are implicitly closed by certain other tags
    const implicitClosers: Record<string, string[]> = {
      'li': ['li'],
      'dt': ['dt', 'dd'],
      'dd': ['dt', 'dd'],
      'p': ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'pre', 'blockquote'],
      'option': ['option', 'optgroup'],
      'optgroup': ['optgroup'],
      'thead': ['tbody', 'tfoot'],
      'tbody': ['tbody', 'tfoot'],
      'tfoot': ['tbody'],
      'tr': ['tr'],
      'td': ['td', 'th'],
      'th': ['td', 'th'],
    };
    return implicitClosers[tag.toLowerCase()] || [];
  }

  private parseNode(): Node | null {
    const expression = this.parseExpression();
    if (expression) return expression;

    const element = this.parseElement();
    if (element) return element;

    const text = this.parseText();
    if (text) return text;

    return null;
  }

  public parse(): ParseResult {
    const children: Node[] = [];
    
    // Check for frontmatter first
    const frontmatter = this.parseFrontmatter();
    if (frontmatter) {
      children.push(frontmatter);
    }

    // Parse remaining content
    while (!this.isAtEnd()) {
      const node = this.parseNode();
      if (node) {
        children.push(node);
      } else {
        // Skip unknown tokens
        this.advance();
      }
    }

    const startLoc = children[0]?.loc.start || { line: 1, column: 1, offset: 0 };
    const endLoc = children[children.length - 1]?.loc.end || startLoc;

    const ast: FragmentNode = {
      type: 'Fragment',
      children,
      loc: {
        start: startLoc,
        end: endLoc,
      },
    };

    return {
      ast,
      diagnostics: this.diagnostics,
    };
  }
}

export function parseAstro(
  source: string,
  options?: ParseOptions
): ParseResult {
  const tokenizer = new Tokenizer(source);
  const tokens = tokenizer.tokenize();
  const parser = new Parser(tokens, options);
  return parser.parse();
}