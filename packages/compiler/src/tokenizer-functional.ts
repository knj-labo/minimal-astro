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

interface TokenizerState {
  readonly source: string;
  readonly position: number;
  readonly line: number;
  readonly column: number;
  readonly mode: Mode;
  readonly modeStack: readonly Mode[];
}

function createInitialState(source: string): TokenizerState {
  return {
    source: normalizeLineEndings(source),
    position: 0,
    line: 1,
    column: 1,
    mode: Mode.HTML,
    modeStack: [],
  };
}

function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n/g, '\n');
}

function getCurrentPosition(state: TokenizerState): Position {
  return {
    line: state.line,
    column: state.column,
    offset: state.position,
  };
}

function advance(state: TokenizerState, count: number = 1): TokenizerState {
  let { position, line, column } = state;
  
  for (let i = 0; i < count; i++) {
    if (position < state.source.length) {
      if (state.source[position] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
      position++;
    }
  }
  
  return { ...state, position, line, column };
}

function peek(state: TokenizerState, offset: number = 0): string {
  return state.source[state.position + offset] || '';
}

function peekSequence(state: TokenizerState, sequence: string): boolean {
  for (let i = 0; i < sequence.length; i++) {
    if (peek(state, i) !== sequence[i]) {
      return false;
    }
  }
  return true;
}

function consumeWhile(
  state: TokenizerState,
  predicate: (char: string) => boolean
): [TokenizerState, string] {
  const start = state.position;
  let currentState = state;
  
  while (currentState.position < currentState.source.length && predicate(peek(currentState))) {
    currentState = advance(currentState);
  }
  
  return [currentState, currentState.source.slice(start, currentState.position)];
}

function pushMode(state: TokenizerState, mode: Mode): TokenizerState {
  return {
    ...state,
    modeStack: [...state.modeStack, state.mode],
    mode,
  };
}

function popMode(state: TokenizerState): TokenizerState {
  if (state.modeStack.length > 0) {
    const newStack = [...state.modeStack];
    const mode = newStack.pop()!;
    return { ...state, mode, modeStack: newStack };
  }
  return state;
}

function isAtStart(state: TokenizerState): boolean {
  return state.position === 0;
}

function isComponentTag(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function scanFrontmatter(state: TokenizerState): [TokenizerState, Token | null] {
  if (isAtStart(state) && peekSequence(state, '---')) {
    const start = getCurrentPosition(state);
    let currentState = advance(state, 3); // Skip ---
    
    const contentStart = currentState.position;
    while (currentState.position < currentState.source.length) {
      if (peek(currentState) === '\n' && peekSequence(currentState, '\n---')) {
        const content = currentState.source.slice(contentStart, currentState.position);
        currentState = advance(currentState); // Skip newline
        currentState = advance(currentState, 3); // Skip ---
        
        return [currentState, {
          type: TokenType.FrontmatterContent,
          value: content.trim(),
          loc: {
            start,
            end: getCurrentPosition(currentState),
          },
        }];
      }
      currentState = advance(currentState);
    }
  }
  return [state, null];
}

function scanExpression(state: TokenizerState): [TokenizerState, Token | null] {
  if (peek(state) === '{') {
    const start = getCurrentPosition(state);
    const startPos = state.position;
    let currentState = advance(state); // Skip {
    
    let depth = 1;
    let incomplete = false;
    
    while (currentState.position < currentState.source.length && depth > 0) {
      const char = peek(currentState);
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          const content = currentState.source.slice(startPos + 1, currentState.position);
          currentState = advance(currentState); // Skip closing }
          return [currentState, {
            type: TokenType.ExpressionContent,
            value: content,
            loc: {
              start,
              end: getCurrentPosition(currentState),
            },
          }];
        }
      } else if (char === '<' && peekSequence(currentState, '</')) {
        // Stop at closing tag to allow better error recovery
        incomplete = true;
        break;
      }
      currentState = advance(currentState);
    }
    
    // Unclosed expression
    const content = currentState.source.slice(startPos + 1, currentState.position);
    return [currentState, {
      type: TokenType.ExpressionContent,
      value: content + (incomplete ? '\x00incomplete' : ''),
      loc: {
        start,
        end: getCurrentPosition(currentState),
      },
    }];
  }
  return [state, null];
}

function scanTag(state: TokenizerState): [TokenizerState, Token | null] {
  const start = getCurrentPosition(state);
  
  if (peek(state) === '<') {
    let currentState = advance(state);
    
    // Check for closing tag
    if (peek(currentState) === '/') {
      currentState = advance(currentState);
      const [newState, name] = consumeWhile(currentState, c => /[a-zA-Z0-9-]/.test(c));
      currentState = newState;
      
      const [spacesState, _] = consumeWhile(currentState, c => c === ' ' || c === '\t');
      currentState = spacesState;
      
      if (peek(currentState) === '>') {
        currentState = advance(currentState);
        return [currentState, {
          type: TokenType.TagClose,
          value: name,
          loc: {
            start,
            end: getCurrentPosition(currentState),
          },
        }];
      }
    } else {
      // Opening tag
      const [newState, name] = consumeWhile(currentState, c => /[a-zA-Z0-9-]/.test(c));
      if (name) {
        const tagState = pushMode(newState, Mode.Tag);
        return [tagState, {
          type: TokenType.TagOpen,
          value: name,
          loc: {
            start,
            end: getCurrentPosition(newState),
          },
        }];
      }
    }
  }
  return [state, null];
}

function scanAttribute(state: TokenizerState): [TokenizerState, Token | null] {
  const [spacesState, _] = consumeWhile(state, c => c === ' ' || c === '\t' || c === '\n');
  let currentState = spacesState;
  
  const start = getCurrentPosition(currentState);
  
  // Check for self-closing
  if (peekSequence(currentState, '/>')) {
    currentState = advance(currentState, 2);
    currentState = popMode(currentState);
    return [currentState, {
      type: TokenType.TagSelfClose,
      value: '/>',
      loc: {
        start,
        end: getCurrentPosition(currentState),
      },
    }];
  }
  
  // Check for tag close
  if (peek(currentState) === '>') {
    currentState = advance(currentState);
    currentState = popMode(currentState);
    return [currentState, {
      type: TokenType.TagClose,
      value: '>',
      loc: {
        start,
        end: getCurrentPosition(currentState),
      },
    }];
  }
  
  // Scan attribute name
  const [nameState, name] = consumeWhile(currentState, c => /[a-zA-Z0-9-:@]/.test(c));
  if (name) {
    currentState = nameState;
    const token: Token = {
      type: TokenType.AttributeName,
      value: name,
      loc: {
        start,
        end: getCurrentPosition(currentState),
      },
    };
    
    const [spacesState2, _2] = consumeWhile(currentState, c => c === ' ' || c === '\t');
    currentState = spacesState2;
    
    // Check for attribute value
    if (peek(currentState) === '=') {
      currentState = advance(currentState);
      const [spacesState3, _3] = consumeWhile(currentState, c => c === ' ' || c === '\t');
      currentState = spacesState3;
      
      let value = '';
      
      if (peek(currentState) === '"' || peek(currentState) === "'") {
        const quote = peek(currentState);
        currentState = advance(currentState);
        const [quotedState, quotedValue] = consumeWhile(currentState, c => c !== quote);
        currentState = quotedState;
        value = quotedValue;
        currentState = advance(currentState); // Skip closing quote
      } else if (peek(currentState) === '{') {
        // Expression attribute value
        const [exprState, expr] = scanExpression(currentState);
        if (expr) {
          currentState = exprState;
          value = '{' + expr.value + '}';
        }
      }
      
      return [currentState, {
        type: TokenType.AttributeValue,
        value: name + '=' + value,
        loc: {
          start: token.loc.start,
          end: getCurrentPosition(currentState),
        },
      }];
    }
    
    return [currentState, token];
  }
  
  return [state, null];
}

function scanText(state: TokenizerState): [TokenizerState, Token | null] {
  const start = getCurrentPosition(state);
  const startPos = state.position;
  let currentState = state;
  
  while (currentState.position < currentState.source.length) {
    const char = peek(currentState);
    if (char === '<' || char === '{') {
      break;
    }
    currentState = advance(currentState);
  }
  
  if (currentState.position > startPos) {
    return [currentState, {
      type: TokenType.Text,
      value: currentState.source.slice(startPos, currentState.position),
      loc: {
        start,
        end: getCurrentPosition(currentState),
      },
    }];
  }
  
  return [state, null];
}

function nextToken(state: TokenizerState): [TokenizerState, Token] {
  if (state.position >= state.source.length) {
    return [state, {
      type: TokenType.EOF,
      value: '',
      loc: {
        start: getCurrentPosition(state),
        end: getCurrentPosition(state),
      },
    }];
  }

  // Check for frontmatter at start
  if (isAtStart(state)) {
    const [newState, frontmatter] = scanFrontmatter(state);
    if (frontmatter) {
      return [newState, frontmatter];
    }
  }

  switch (state.mode) {
    case Mode.Tag:
      const [attrState, attr] = scanAttribute(state);
      if (attr) return [attrState, attr];
      break;
      
    case Mode.HTML:
      // Check for expression
      const [exprState, expr] = scanExpression(state);
      if (expr) return [exprState, expr];
      
      // Check for tag
      const [tagState, tag] = scanTag(state);
      if (tag) return [tagState, tag];
      
      // Otherwise, scan text
      const [textState, text] = scanText(state);
      if (text) return [textState, text];
      break;
  }

  // Fallback: advance and try again
  return nextToken(advance(state));
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let state = createInitialState(source);
  let token: Token;
  
  do {
    [state, token] = nextToken(state);
    if (token.type !== TokenType.EOF) {
      tokens.push(token);
    }
  } while (token.type !== TokenType.EOF);
  
  return tokens;
}