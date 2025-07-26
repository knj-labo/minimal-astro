import { describe, expect, it } from 'vitest';
import { TokenType, tokenize } from '../../src/tokenizer';

describe('Tokenizer', () => {
  it('should tokenize simple html', () => {
    const input = '<h1>Hello</h1>';
    const tokens = tokenize(input);
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.TagOpen,
      TokenType.TagClose,
      TokenType.Text,
      TokenType.TagClose,
    ]);
    expect(tokens[0].value).toBe('h1');
    expect(tokens[1].value).toBe('>');
    expect(tokens[2].value).toBe('Hello');
    expect(tokens[3].value).toBe('h1');
  });

  it('CMP-2: should tokenize nested components preserving hierarchy order', () => {
    const input = '<Foo><Bar/></Foo>';
    const tokens = tokenize(input);

    // Verify token stream preserves hierarchy order
    const tokenStream = tokens.map((t) => ({ type: t.type, value: t.value }));

    expect(tokenStream).toEqual([
      { type: TokenType.TagOpen, value: 'Foo' },
      { type: TokenType.TagClose, value: '>' },
      { type: TokenType.TagOpen, value: 'Bar' },
      { type: TokenType.TagSelfClose, value: '/>' },
      { type: TokenType.TagClose, value: 'Foo' },
    ]);

    // Verify the hierarchy is correctly represented
    expect(tokens[0].value).toBe('Foo'); // Parent component open
    expect(tokens[2].value).toBe('Bar'); // Child component open
    expect(tokens[3].type).toBe(TokenType.TagSelfClose); // Child self-closes
    expect(tokens[4].value).toBe('Foo'); // Parent component close
  });

  it('should handle deeply nested components', () => {
    const input = '<A><B><C><D/></C></B></A>';
    const tokens = tokenize(input);

    const componentNames = tokens
      .filter((t) => t.type === TokenType.TagOpen || t.type === TokenType.TagClose)
      .filter((t) => t.value !== '>' && t.value !== '/>')
      .map((t) => t.value);

    // Should see opening tags A, B, C, D, then closing tags C, B, A
    expect(componentNames).toEqual(['A', 'B', 'C', 'D', 'C', 'B', 'A']);
  });

  it('should handle mixed HTML and components', () => {
    const input = '<div><MyComponent prop="value"><span>text</span></MyComponent></div>';
    const tokens = tokenize(input);

    // Check that we can identify component vs regular HTML tags
    const tagOpenTokens = tokens.filter((t) => t.type === TokenType.TagOpen);
    expect(tagOpenTokens.map((t) => t.value)).toEqual(['div', 'MyComponent', 'span']);
  });

  it('should tokenize component with attributes', () => {
    const input = '<Counter initialCount={42} client:visible />';
    const tokens = tokenize(input);

    // Find attribute tokens
    const attrTokens = tokens.filter(
      (t) => t.type === TokenType.AttributeName || t.type === TokenType.AttributeValue
    );

    expect(attrTokens.length).toBeGreaterThan(0);

    // Check that attributes are captured
    const attrValues = attrTokens.map((t) => t.value);
    expect(attrValues.some((v) => v.includes('initialCount'))).toBe(true);
    expect(attrValues.some((v) => v.includes('client:visible'))).toBe(true);
  });
});
