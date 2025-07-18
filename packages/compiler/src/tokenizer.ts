import type { Position, SourceSpan } from '../types/ast.js';

export enum TokenType {
  Text = 'Text',
  TagOpen = 'TagOpen',
  TagClose = 'TagClose',
  TagSelfClose = 'TagSelfClose',
  AttributeName = 'AttributeName',
  AttributeValue = 'AttributeValue',
  ExpressionStart = 'ExpressionStart',
  ExpressionEnd = 'ExpressionEnd',
  ExpressionContent = 'ExpressionContent',
  FrontmatterStart = 'FrontmatterStart',
  FrontmatterEnd = 'FrontmatterEnd',
  FrontmatterContent = 'FrontmatterContent',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  loc: SourceSpan;
}

export enum Mode {
  HTML = 'HTML',
  Expression = 'Expression',
  Frontmatter = 'Frontmatter',
  Tag = 'Tag',
  Attribute = 'Attribute',
}

export class Tokenizer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private mode: Mode = Mode.HTML;
  private modeStack: Mode[] = [];

  constructor(source: string) {
    this.source = this.normalizeLineEndings(source);
  }

  private normalizeLineEndings(source: string): string {
    return source.replace(/\r\n/g, '\n');
  }

  private getCurrentPosition(): Position {
    return {
      line: this.line,
      column: this.column,
      offset: this.position,
    };
  }

  private advance(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.position < this.source.length) {
        if (this.source[this.position] === '\n') {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        this.position++;
      }
    }
  }

  private peek(offset: number = 0): string {
    return this.source[this.position + offset] || '';
  }

  private peekSequence(sequence: string): boolean {
    for (let i = 0; i < sequence.length; i++) {
      if (this.peek(i) !== sequence[i]) {
        return false;
      }
    }
    return true;
  }

  private consumeWhile(predicate: (char: string) => boolean): string {
    let result = '';
    while (this.position < this.source.length && predicate(this.peek())) {
      result += this.peek();
      this.advance();
    }
    return result;
  }

  private pushMode(mode: Mode): void {
    this.modeStack.push(this.mode);
    this.mode = mode;
  }

  private popMode(): void {
    if (this.modeStack.length > 0) {
      this.mode = this.modeStack.pop()!;
    }
  }

  private isAtStart(): boolean {
    return this.position === 0;
  }

  private isComponentTag(name: string): boolean {
    return /^[A-Z]/.test(name);
  }

  private scanFrontmatter(): Token | null {
    if (this.isAtStart() && this.peekSequence('---')) {
      const start = this.getCurrentPosition();
      this.advance(3); // Skip ---
      
      const contentStart = this.position;
      while (this.position < this.source.length) {
        if (this.peek() === '\n' && this.peekSequence('\n---')) {
          const content = this.source.slice(contentStart, this.position);
          this.advance(); // Skip newline
          this.advance(3); // Skip ---
          
          return {
            type: TokenType.FrontmatterContent,
            value: content.trim(),
            loc: {
              start,
              end: this.getCurrentPosition(),
            },
          };
        }
        this.advance();
      }
    }
    return null;
  }

  private scanExpression(): Token | null {
    if (this.peek() === '{') {
      const start = this.getCurrentPosition();
      this.advance(); // Skip {
      
      let depth = 1;
      let content = '';
      let incomplete = false;
      
      while (this.position < this.source.length && depth > 0) {
        const char = this.peek();
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            this.advance(); // Skip closing }
            return {
              type: TokenType.ExpressionContent,
              value: content,
              loc: {
                start,
                end: this.getCurrentPosition(),
              },
            };
          }
        }
        content += char;
        this.advance();
      }
      
      // Unclosed expression
      return {
        type: TokenType.ExpressionContent,
        value: content,
        loc: {
          start,
          end: this.getCurrentPosition(),
        },
      };
    }
    return null;
  }

  private scanTag(): Token | null {
    const start = this.getCurrentPosition();
    
    if (this.peek() === '<') {
      this.advance();
      
      // Check for closing tag
      if (this.peek() === '/') {
        this.advance();
        const name = this.consumeWhile(c => /[a-zA-Z0-9-]/.test(c));
        this.consumeWhile(c => c === ' ' || c === '\t');
        if (this.peek() === '>') {
          this.advance();
          return {
            type: TokenType.TagClose,
            value: name,
            loc: {
              start,
              end: this.getCurrentPosition(),
            },
          };
        }
      } else {
        // Opening tag
        const name = this.consumeWhile(c => /[a-zA-Z0-9-]/.test(c));
        if (name) {
          this.pushMode(Mode.Tag);
          return {
            type: TokenType.TagOpen,
            value: name,
            loc: {
              start,
              end: this.getCurrentPosition(),
            },
          };
        }
      }
    }
    return null;
  }

  private scanAttribute(): Token | null {
    this.consumeWhile(c => c === ' ' || c === '\t' || c === '\n');
    
    const start = this.getCurrentPosition();
    
    // Check for self-closing
    if (this.peekSequence('/>')) {
      this.advance(2);
      this.popMode();
      return {
        type: TokenType.TagSelfClose,
        value: '/>',
        loc: {
          start,
          end: this.getCurrentPosition(),
        },
      };
    }
    
    // Check for tag close
    if (this.peek() === '>') {
      this.advance();
      this.popMode();
      return {
        type: TokenType.TagClose,
        value: '>',
        loc: {
          start,
          end: this.getCurrentPosition(),
        },
      };
    }
    
    // Scan attribute name
    const name = this.consumeWhile(c => /[a-zA-Z0-9-:@]/.test(c));
    if (name) {
      const token: Token = {
        type: TokenType.AttributeName,
        value: name,
        loc: {
          start,
          end: this.getCurrentPosition(),
        },
      };
      
      this.consumeWhile(c => c === ' ' || c === '\t');
      
      // Check for attribute value
      if (this.peek() === '=') {
        this.advance();
        this.consumeWhile(c => c === ' ' || c === '\t');
        
        const valueStart = this.getCurrentPosition();
        let value = '';
        
        if (this.peek() === '"' || this.peek() === "'") {
          const quote = this.peek();
          this.advance();
          value = this.consumeWhile(c => c !== quote);
          this.advance(); // Skip closing quote
        } else if (this.peek() === '{') {
          // Expression attribute value
          const expr = this.scanExpression();
          if (expr) {
            value = '{' + expr.value + '}';
          }
        }
        
        return {
          type: TokenType.AttributeValue,
          value: name + '=' + value,
          loc: {
            start: token.loc.start,
            end: this.getCurrentPosition(),
          },
        };
      }
      
      return token;
    }
    
    return null;
  }

  private scanText(): Token | null {
    const start = this.getCurrentPosition();
    let content = '';
    
    while (this.position < this.source.length) {
      if (this.peek() === '<' || this.peek() === '{') {
        break;
      }
      content += this.peek();
      this.advance();
    }
    
    if (content) {
      return {
        type: TokenType.Text,
        value: content,
        loc: {
          start,
          end: this.getCurrentPosition(),
        },
      };
    }
    
    return null;
  }

  public nextToken(): Token {
    if (this.position >= this.source.length) {
      return {
        type: TokenType.EOF,
        value: '',
        loc: {
          start: this.getCurrentPosition(),
          end: this.getCurrentPosition(),
        },
      };
    }

    // Check for frontmatter at start
    if (this.isAtStart()) {
      const frontmatter = this.scanFrontmatter();
      if (frontmatter) {
        return frontmatter;
      }
    }

    switch (this.mode) {
      case Mode.Tag:
        const attr = this.scanAttribute();
        if (attr) return attr;
        break;
        
      case Mode.HTML:
        // Check for expression
        const expr = this.scanExpression();
        if (expr) return expr;
        
        // Check for tag
        const tag = this.scanTag();
        if (tag) return tag;
        
        // Otherwise, scan text
        const text = this.scanText();
        if (text) return text;
        break;
    }

    // Fallback: advance and try again
    this.advance();
    return this.nextToken();
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    let token = this.nextToken();
    
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.nextToken();
    }
    
    return tokens;
  }
}