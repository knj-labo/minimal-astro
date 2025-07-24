export var TokenType;
((TokenType) => {
  TokenType['Text'] = 'Text';
  TokenType['TagOpen'] = 'TagOpen';
  TokenType['TagClose'] = 'TagClose';
  TokenType['TagSelfClose'] = 'TagSelfClose';
  TokenType['AttributeName'] = 'AttributeName';
  TokenType['AttributeValue'] = 'AttributeValue';
  TokenType['ExpressionStart'] = 'ExpressionStart';
  TokenType['ExpressionEnd'] = 'ExpressionEnd';
  TokenType['ExpressionContent'] = 'ExpressionContent';
  TokenType['FrontmatterStart'] = 'FrontmatterStart';
  TokenType['FrontmatterEnd'] = 'FrontmatterEnd';
  TokenType['FrontmatterContent'] = 'FrontmatterContent';
  TokenType['EOF'] = 'EOF';
})(TokenType || (TokenType = {}));
export var Mode;
((Mode) => {
  Mode['HTML'] = 'HTML';
  Mode['Expression'] = 'Expression';
  Mode['Frontmatter'] = 'Frontmatter';
  Mode['Tag'] = 'Tag';
  Mode['Attribute'] = 'Attribute';
  Mode['Style'] = 'Style';
  Mode['Script'] = 'Script';
})(Mode || (Mode = {}));
function createInitialState(source) {
  return {
    source: normalizeLineEndings(source),
    position: 0,
    line: 1,
    column: 1,
    mode: Mode.HTML,
    modeStack: [],
    currentTagName: undefined,
  };
}
function normalizeLineEndings(source) {
  return source.replace(/\r\n/g, '\n');
}
function getCurrentPosition(state) {
  return {
    line: state.line,
    column: state.column,
    offset: state.position,
  };
}
function advance(state, count = 1) {
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
function peek(state, offset = 0) {
  return state.source[state.position + offset] ?? '';
}
function peekSequence(state, sequence) {
  for (let i = 0; i < sequence.length; i++) {
    if (peek(state, i) !== sequence[i]) {
      return false;
    }
  }
  return true;
}
function consumeWhile(state, predicate) {
  const start = state.position;
  let currentState = state;
  while (currentState.position < currentState.source.length && predicate(peek(currentState))) {
    currentState = advance(currentState);
  }
  return [currentState, currentState.source.slice(start, currentState.position)];
}
function pushMode(state, mode) {
  return {
    ...state,
    modeStack: [...state.modeStack, state.mode],
    mode,
  };
}
function popMode(state) {
  if (state.modeStack.length > 0) {
    const newStack = [...state.modeStack];
    const mode = newStack.pop();
    if (mode) {
      return { ...state, mode, modeStack: newStack, currentTagName: undefined };
    }
  }
  return state;
}
function setTagName(state, tagName) {
  return { ...state, currentTagName: tagName };
}
function isAtStart(state) {
  return state.position === 0;
}
// Removed unused function - component detection is handled in parser
function scanFrontmatter(state) {
  if (isAtStart(state) && peekSequence(state, '---')) {
    const start = getCurrentPosition(state);
    let currentState = advance(state, 3); // Skip ---
    const contentStart = currentState.position;
    while (currentState.position < currentState.source.length) {
      if (peek(currentState) === '\n' && peekSequence(currentState, '\n---')) {
        const content = currentState.source.slice(contentStart, currentState.position);
        currentState = advance(currentState); // Skip newline
        currentState = advance(currentState, 3); // Skip ---
        return [
          currentState,
          {
            type: TokenType.FrontmatterContent,
            value: content.trim(),
            loc: {
              start,
              end: getCurrentPosition(currentState),
            },
          },
        ];
      }
      currentState = advance(currentState);
    }
  }
  return [state, null];
}
function scanExpression(state) {
  // Skip expression scanning when in Style/Script mode (raw content)
  if (state.mode === Mode.Style || state.mode === Mode.Script) {
    return [state, null];
  }
  if (peek(state) === '{') {
    const start = getCurrentPosition(state);
    const startPos = state.position;
    let currentState = advance(state); // Skip {
    let depth = 1;
    const incomplete = false;
    while (currentState.position < currentState.source.length && depth > 0) {
      const char = peek(currentState);
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          const content = currentState.source.slice(startPos + 1, currentState.position);
          currentState = advance(currentState); // Skip closing }
          return [
            currentState,
            {
              type: TokenType.ExpressionContent,
              value: content,
              loc: {
                start,
                end: getCurrentPosition(currentState),
              },
            },
          ];
        }
      }
      currentState = advance(currentState);
    }
    // Unclosed expression
    const content = currentState.source.slice(startPos + 1, currentState.position);
    return [
      currentState,
      {
        type: TokenType.ExpressionContent,
        value: content + (incomplete ? '\x00incomplete' : ''),
        loc: {
          start,
          end: getCurrentPosition(currentState),
        },
      },
    ];
  }
  return [state, null];
}
function scanTag(state) {
  const start = getCurrentPosition(state);
  if (peek(state) === '<') {
    let currentState = advance(state);
    // Check for DOCTYPE declaration
    if (peekSequence(state, '<!DOCTYPE')) {
      // Consume the entire DOCTYPE declaration as text
      const [newState, _doctypeContent] = consumeWhile(state, (c) => c !== '>' && c !== '\0');
      currentState = newState;
      // Consume the closing '>'
      if (peek(currentState) === '>') {
        currentState = advance(currentState);
      }
      // Return the entire DOCTYPE as a text token
      return [
        currentState,
        {
          type: TokenType.Text,
          value: state.source.slice(state.position, currentState.position),
          loc: {
            start,
            end: getCurrentPosition(currentState),
          },
        },
      ];
    }
    // Check for closing tag
    if (peek(currentState) === '/') {
      currentState = advance(currentState);
      const [newState, name] = consumeWhile(currentState, (c) => /[a-zA-Z0-9-]/.test(c));
      currentState = newState;
      const [spacesState, _] = consumeWhile(currentState, (c) => c === ' ' || c === '\t');
      currentState = spacesState;
      if (peek(currentState) === '>') {
        currentState = advance(currentState);
        // If closing a style/script tag, exit the respective mode
        if (name === 'style' && state.mode === Mode.Style) {
          currentState = { ...currentState, mode: Mode.HTML };
        } else if (name === 'script' && state.mode === Mode.Script) {
          currentState = { ...currentState, mode: Mode.HTML };
        }
        return [
          currentState,
          {
            type: TokenType.TagClose,
            value: name,
            loc: {
              start,
              end: getCurrentPosition(currentState),
            },
          },
        ];
      }
    } else {
      // Opening tag
      const [newState, name] = consumeWhile(currentState, (c) => /[a-zA-Z0-9-]/.test(c));
      if (name) {
        const tagState = setTagName(pushMode(newState, Mode.Tag), name);
        return [
          tagState,
          {
            type: TokenType.TagOpen,
            value: name,
            loc: {
              start,
              end: getCurrentPosition(newState),
            },
          },
        ];
      }
    }
  }
  return [state, null];
}
function scanAttribute(state) {
  const [spacesState, _] = consumeWhile(state, (c) => c === ' ' || c === '\t' || c === '\n');
  let currentState = spacesState;
  const start = getCurrentPosition(currentState);
  // Check for self-closing
  if (peekSequence(currentState, '/>')) {
    currentState = advance(currentState, 2);
    currentState = popMode(currentState);
    return [
      currentState,
      {
        type: TokenType.TagSelfClose,
        value: '/>',
        loc: {
          start,
          end: getCurrentPosition(currentState),
        },
      },
    ];
  }
  // Check for tag close
  if (peek(currentState) === '>') {
    currentState = advance(currentState);
    // If closing a style/script tag, enter the respective raw text mode
    if (state.currentTagName === 'style') {
      currentState = { ...popMode(currentState), mode: Mode.Style };
    } else if (state.currentTagName === 'script') {
      currentState = { ...popMode(currentState), mode: Mode.Script };
    } else {
      currentState = popMode(currentState);
    }
    return [
      currentState,
      {
        type: TokenType.TagClose,
        value: '>',
        loc: {
          start,
          end: getCurrentPosition(currentState),
        },
      },
    ];
  }
  // Scan attribute name
  const [nameState, name] = consumeWhile(currentState, (c) => /[a-zA-Z0-9-:@]/.test(c));
  if (name) {
    currentState = nameState;
    const token = {
      type: TokenType.AttributeName,
      value: name,
      loc: {
        start,
        end: getCurrentPosition(currentState),
      },
    };
    const [spacesState2, _2] = consumeWhile(currentState, (c) => c === ' ' || c === '\t');
    currentState = spacesState2;
    // Check for attribute value
    if (peek(currentState) === '=') {
      currentState = advance(currentState);
      const [spacesState3, _3] = consumeWhile(currentState, (c) => c === ' ' || c === '\t');
      currentState = spacesState3;
      let value = '';
      if (peek(currentState) === '"' || peek(currentState) === "'") {
        const quote = peek(currentState);
        currentState = advance(currentState);
        const [quotedState, quotedValue] = consumeWhile(currentState, (c) => c !== quote);
        currentState = quotedState;
        value = quotedValue;
        currentState = advance(currentState); // Skip closing quote
      } else if (peek(currentState) === '{') {
        // Expression attribute value
        const [exprState, expr] = scanExpression(currentState);
        if (expr) {
          currentState = exprState;
          value = `{${expr.value}}`;
        }
      }
      // Store the combined token for now - the parser will handle this
      return [
        currentState,
        {
          type: TokenType.AttributeValue,
          value: `${name}=${value}`,
          loc: {
            start: token.loc.start,
            end: getCurrentPosition(currentState),
          },
        },
      ];
    }
    return [currentState, token];
  }
  return [state, null];
}
function scanText(state) {
  const start = getCurrentPosition(state);
  const startPos = state.position;
  // Special handling for Style/Script modes - scan until closing tag
  if (state.mode === Mode.Style || state.mode === Mode.Script) {
    const source = state.source;
    const closingTag = state.mode === Mode.Style ? '</style>' : '</script>';
    const closingIndex = source.indexOf(closingTag, startPos);
    if (closingIndex !== -1 && closingIndex > startPos) {
      // Found closing tag, scan text up to it
      const text = source.slice(startPos, closingIndex);
      // Count newlines for position tracking
      let line = state.line;
      let column = state.column;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }
      }
      const newState = {
        ...state,
        position: closingIndex,
        line,
        column,
      };
      return [
        newState,
        {
          type: TokenType.Text,
          value: text,
          loc: {
            start,
            end: getCurrentPosition(newState),
          },
        },
      ];
    }
    // If no closing tag found, consume rest of content
    const [newState, content] = consumeWhile(state, (c) => c !== '\0');
    return [
      newState,
      {
        type: TokenType.Text,
        value: content,
        loc: {
          start,
          end: getCurrentPosition(newState),
        },
      },
    ];
  }
  // Normal text scanning for non-Style modes
  const source = state.source;
  let nextLt = source.indexOf('<', startPos);
  let nextBrace = source.indexOf('{', startPos);
  if (nextLt === -1) nextLt = source.length;
  if (nextBrace === -1) nextBrace = source.length;
  const endPos = Math.min(nextLt, nextBrace);
  if (endPos > startPos) {
    // Fast forward position tracking
    const text = source.slice(startPos, endPos);
    const newlines = text.split('\n').length - 1;
    const lastNewlineIndex = text.lastIndexOf('\n');
    const newState = {
      ...state,
      position: endPos,
      line: state.line + newlines,
      column: newlines > 0 ? text.length - lastNewlineIndex : state.column + text.length,
    };
    return [
      newState,
      {
        type: TokenType.Text,
        value: text,
        loc: {
          start,
          end: getCurrentPosition(newState),
        },
      },
    ];
  }
  return [state, null];
}
// Optimized version for buffer-based processing
function scanTextOptimized(state) {
  const start = getCurrentPosition(state);
  const startPos = state.position;
  const source = state.source;
  let pos = startPos;
  // Fast character scanning without function calls
  while (pos < source.length) {
    const charCode = source.charCodeAt(pos);
    if (charCode === 60 || charCode === 123) {
      // '<' or '{'
      break;
    }
    pos++;
  }
  if (pos > startPos) {
    // Count newlines efficiently
    let line = state.line;
    let column = state.column;
    let lastNewlinePos = -1;
    for (let i = startPos; i < pos; i++) {
      if (source.charCodeAt(i) === 10) {
        // '\n'
        line++;
        column = 1;
        lastNewlinePos = i;
      } else if (lastNewlinePos === -1) {
        column++;
      }
    }
    if (lastNewlinePos !== -1) {
      column = pos - lastNewlinePos;
    }
    const newState = {
      ...state,
      position: pos,
      line,
      column,
    };
    return [
      newState,
      {
        type: TokenType.Text,
        value: source.slice(startPos, pos),
        loc: {
          start,
          end: getCurrentPosition(newState),
        },
      },
    ];
  }
  return [state, null];
}
function nextToken(state) {
  if (state.position >= state.source.length) {
    return [
      state,
      {
        type: TokenType.EOF,
        value: '',
        loc: {
          start: getCurrentPosition(state),
          end: getCurrentPosition(state),
        },
      },
    ];
  }
  // Check for frontmatter at start
  if (isAtStart(state)) {
    const [newState, frontmatter] = scanFrontmatter(state);
    if (frontmatter) {
      return [newState, frontmatter];
    }
  }
  switch (state.mode) {
    case Mode.Tag: {
      const [attrState, attr] = scanAttribute(state);
      if (attr) return [attrState, attr];
      break;
    }
    case Mode.Style:
    case Mode.Script: {
      // Check for closing tag
      const [tagState, tag] = scanTag(state);
      if (tag) return [tagState, tag];
      // Otherwise, scan content as text
      const [textState, text] = scanText(state);
      if (text) return [textState, text];
      break;
    }
    case Mode.HTML: {
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
  }
  // Fallback: advance and try again
  return nextToken(advance(state));
}
function createTokenPool() {
  const pool = [];
  const maxPoolSize = 100;
  return {
    acquire() {
      const token = pool.pop();
      if (token) {
        // Reset token properties
        token.type = TokenType.EOF;
        token.value = '';
        token.loc = {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        };
        return token;
      }
      return {
        type: TokenType.EOF,
        value: '',
        loc: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      };
    },
    release(token) {
      if (pool.length < maxPoolSize) {
        pool.push(token);
      }
    },
  };
}
// ASCII lookup table for fast character dispatch
const ASCII_HANDLERS = new Array(128);
const UNICODE_HANDLERS = new Map();
// Initialize ASCII handlers
ASCII_HANDLERS[60] = scanTag; // '<'
ASCII_HANDLERS[123] = scanExpression; // '{'
// Initialize Unicode handlers for special characters
UNICODE_HANDLERS.set('<', scanTag);
UNICODE_HANDLERS.set('{', scanExpression);
function getCharacterHandler(char) {
  const charCode = char.charCodeAt(0);
  if (charCode < 128) {
    return ASCII_HANDLERS[charCode];
  }
  return UNICODE_HANDLERS.get(char) ?? null;
}
// Optimized tokenizer with jump tables and object pooling
export function tokenize(source) {
  const tokens = [];
  const tokenPool = createTokenPool();
  let state = createInitialState(source);
  while (state.position < state.source.length) {
    const [newState, token] = nextTokenOptimized(state, tokenPool);
    state = newState;
    if (token && token.type !== TokenType.EOF) {
      tokens.push(token);
    }
  }
  return tokens;
}
function nextTokenOptimized(state, tokenPool) {
  if (state.position >= state.source.length) {
    const token = tokenPool.acquire();
    token.type = TokenType.EOF;
    token.value = '';
    token.loc = {
      start: getCurrentPosition(state),
      end: getCurrentPosition(state),
    };
    return [state, token];
  }
  // Check for frontmatter at start
  if (isAtStart(state)) {
    const [newState, frontmatter] = scanFrontmatter(state);
    if (frontmatter) {
      return [newState, frontmatter];
    }
  }
  switch (state.mode) {
    case Mode.Tag: {
      const [attrState, attr] = scanAttribute(state);
      if (attr) return [attrState, attr];
      break;
    }
    case Mode.Style:
    case Mode.Script: {
      // Check for closing tag
      const [tagState, tag] = scanTag(state);
      if (tag) return [tagState, tag];
      // Otherwise, scan content as text
      const [textState, text] = scanText(state);
      if (text) return [textState, text];
      break;
    }
    case Mode.HTML: {
      // Use jump table for fast character dispatch
      const char = peek(state);
      const handler = getCharacterHandler(char);
      if (handler) {
        const [newState, token] = handler(state);
        if (token) return [newState, token];
      }
      // Fallback to optimized text scanning
      const [textState, text] = scanTextOptimized(state);
      if (text) return [textState, text];
      break;
    }
  }
  // Fallback: advance position and return a text token for the character
  const char = state.source[state.position];
  const advancedState = advance(state);
  const token = tokenPool.acquire();
  token.type = TokenType.Text;
  token.value = char;
  token.loc = {
    start: getCurrentPosition(state),
    end: getCurrentPosition(advancedState),
  };
  return [advancedState, token];
}
// Legacy function for backward compatibility
export function tokenizeLegacy(source) {
  const tokens = [];
  let state = createInitialState(source);
  let token;
  do {
    [state, token] = nextToken(state);
    if (token.type !== TokenType.EOF) {
      tokens.push(token);
    }
  } while (token.type !== TokenType.EOF);
  return tokens;
}
//# sourceMappingURL=tokenizer.js.map
