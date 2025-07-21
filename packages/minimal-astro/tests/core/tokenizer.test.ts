import { describe, expect, it } from 'bun:test';
import { TokenType, tokenize } from '../../src/core/tokenizer.js';

describe('Tokenizer', () => {
  describe('HTML Mode', () => {
    it('should tokenize simple HTML text', () => {
      const source = 'Hello World';
      const tokens = tokenize(source);

      expect(tokens).toHaveLength(1); // Just Text (EOF not included)
      expect(tokens[0].type).toBe(TokenType.Text);
      expect(tokens[0].value).toBe('Hello World');
    });

    it('should tokenize HTML elements', () => {
      const source = '<div>content</div>';
      const tokens = tokenize(source);

      expect(tokens).toHaveLength(4); // TagOpen, TagClose (>), Text, TagClose (div)
      expect(tokens[0].type).toBe(TokenType.TagOpen);
      expect(tokens[0].value).toBe('div');
      expect(tokens[1].type).toBe(TokenType.TagClose);
      expect(tokens[1].value).toBe('>');
      expect(tokens[2].type).toBe(TokenType.Text);
      expect(tokens[2].value).toBe('content');
      expect(tokens[3].type).toBe(TokenType.TagClose);
      expect(tokens[3].value).toBe('div');
    });

    it('should handle self-closing tags', () => {
      const source = "<img src='test.jpg' />";
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.TagOpen);
      expect(tokens[0].value).toBe('img');
      // Should have attribute tokens
      const hasAttributeValue = tokens.some((t) => t.type === TokenType.AttributeValue);
      expect(hasAttributeValue).toBe(true);
      // Should have self-close token
      const hasSelfClose = tokens.some((t) => t.type === TokenType.TagSelfClose);
      expect(hasSelfClose).toBe(true);
    });

    it('should tokenize attributes', () => {
      const source = '<div class="test" id="main">';
      const tokens = tokenize(source);

      const attributeTokens = tokens.filter(
        (t) => t.type === TokenType.AttributeName || t.type === TokenType.AttributeValue
      );
      expect(attributeTokens.length).toBeGreaterThan(0);
    });
  });

  describe('Expression Mode', () => {
    it('should tokenize simple expressions', () => {
      const source = '{title}';
      const tokens = tokenize(source);

      const expressionTokens = tokens.filter((t) => t.type === TokenType.ExpressionContent);
      expect(expressionTokens).toHaveLength(1);
      expect(expressionTokens[0].value).toBe('title');
    });

    it('should handle complex expressions', () => {
      const source = "{user.name || 'Anonymous'}";
      const tokens = tokenize(source);

      const expressionTokens = tokens.filter((t) => t.type === TokenType.ExpressionContent);
      expect(expressionTokens).toHaveLength(1);
      expect(expressionTokens[0].value).toBe("user.name || 'Anonymous'");
    });

    it('should handle expressions in attributes', () => {
      const source = '<div class={className}>';
      const tokens = tokenize(source);

      // Should have AttributeValue containing the expression
      const attributeTokens = tokens.filter((t) => t.type === TokenType.AttributeValue);
      expect(attributeTokens.length).toBeGreaterThanOrEqual(1);
      expect(attributeTokens[0].value).toContain('className');
    });
  });

  describe('Frontmatter Mode', () => {
    it('should tokenize frontmatter', () => {
      const source = "---\nconst title = 'Test';\n---\n<h1>{title}</h1>";
      const tokens = tokenize(source);

      const frontmatterTokens = tokens.filter((t) => t.type === TokenType.FrontmatterContent);
      expect(frontmatterTokens).toHaveLength(1);
      expect(frontmatterTokens[0].value).toContain("const title = 'Test';");
    });

    it('should handle empty frontmatter', () => {
      const source = '---\n---\n<h1>Title</h1>';
      const tokens = tokenize(source);

      const frontmatterTokens = tokens.filter((t) => t.type === TokenType.FrontmatterContent);
      expect(frontmatterTokens).toHaveLength(1);
    });
  });

  describe('Mixed Content', () => {
    it('should handle frontmatter with HTML and expressions', () => {
      const source = "---\nconst name = 'World';\n---\n<h1>Hello {name}!</h1>";
      const tokens = tokenize(source);

      // Should have frontmatter, HTML, and expression tokens
      const types = new Set(tokens.map((t) => t.type));
      expect(types.has(TokenType.FrontmatterContent)).toBe(true);
      expect(types.has(TokenType.TagOpen)).toBe(true);
      expect(types.has(TokenType.ExpressionContent)).toBe(true);
      expect(types.has(TokenType.Text)).toBe(true);
    });

    it('should handle component tags', () => {
      const source = '<Counter client:visible />';
      const tokens = tokenize(source);

      expect(tokens[0].type).toBe(TokenType.TagOpen);
      expect(tokens[0].value).toBe('Counter');

      // Should have client directive attribute
      const hasClientDirective = tokens.some(
        (t) =>
          (t.type === TokenType.AttributeName || t.type === TokenType.AttributeValue) &&
          t.value.includes('client:visible')
      );
      expect(hasClientDirective).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unclosed expressions gracefully', () => {
      const source = '{unclosed expression';
      const tokens = tokenize(source);

      // Should still produce tokens and not crash
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].type).toBe(TokenType.ExpressionContent);
    });

    it('should handle unclosed tags gracefully', () => {
      const source = '<div>content without closing';
      const tokens = tokenize(source);

      // Should still produce tokens
      expect(tokens.length).toBeGreaterThan(1);
      expect(tokens[0].type).toBe(TokenType.TagOpen);
    });
  });

  describe('Position Tracking', () => {
    it('should track line and column positions', () => {
      const source = 'line 1\nline 2\nline 3';
      const tokens = tokenize(source);

      const textToken = tokens[0];
      expect(textToken.loc.start.line).toBe(1);
      expect(textToken.loc.start.column).toBe(1);
      expect(textToken.loc.end.line).toBeGreaterThan(1);
    });

    it('should handle multiline expressions', () => {
      const source = '{\n  multiline\n  expression\n}';
      const tokens = tokenize(source);

      const expressionToken = tokens.find((t) => t.type === TokenType.ExpressionContent);
      expect(expressionToken).toBeDefined();
      expect(expressionToken?.loc.start.line).toBe(1);
      expect(expressionToken?.loc.end.line).toBe(4);
    });
  });
});
