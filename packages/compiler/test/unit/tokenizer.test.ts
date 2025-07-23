import { tokenize, TokenType } from '../../src/tokenizer';
import { describe, it, expect } from 'vitest';

describe('Tokenizer', () => {
  it('should tokenize simple html', () => {
    const input = '<h1>Hello</h1>';
    const tokens = tokenize(input);
    expect(tokens.map(t => t.type)).toEqual([
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
});