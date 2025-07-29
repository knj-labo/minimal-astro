import { tokenize } from '../tokenizer/index.js'
/**
 * Parse Astro source code into an Abstract Syntax Tree (AST)
 *
 * @param source - The Astro source code to parse
 * @returns The root AST node (Program)
 *
 * @example
 * ```typescript
 * const ast = parse('<div>Hello {name}</div>')
 * console.log(ast) // { type: 'Program', children: [...] }
 * ```
 */
export function parse(source) {
  const tokens = tokenize(source)
  const initialState = { tokens, current: 0 }
  const { children } = parseProgram(initialState)
  return {
    type: 'Program',
    children,
  }
}
/**
 * Parse the entire program by collecting all top-level nodes
 *
 * @param initialState - The initial parser state
 * @returns An object containing the parsed children and final state
 */
function parseProgram(initialState) {
  const children = []
  let state = initialState
  while (!isAtEnd(state)) {
    const { node, state: nextState } = parseNode(state)
    if (node) {
      children.push(node)
    }
    state = nextState
  }
  return { children, state }
}
/**
 * Parse a single node based on the current token
 *
 * @param state - The current parser state
 * @returns An object containing the parsed node (or null) and new state
 */
function parseNode(state) {
  const token = peek(state)
  if (token.type === 'FRONTMATTER_START') {
    return parseFrontmatter(state)
  }
  if (token.type === 'HTML_TAG_OPEN') {
    return parseElement(state)
  }
  if (token.type === 'HTML_TAG_CLOSE' && peek(state, 1)?.type === 'HTML_TAG_NAME') {
    // Skip closing tags, they're handled in parseElement
    const s1 = advance(state) // </
    const s2 = advance(s1.state) // tag name
    const s3 = advance(s2.state) // >
    return { node: null, state: s3.state }
  }
  if (token.type === 'EXPRESSION_START') {
    return parseExpression(state)
  }
  if (token.type === 'TEXT') {
    return parseText(state)
  }
  if (token.type === 'EOF') {
    return { node: null, state }
  }
  // Skip unknown tokens
  return { node: null, state: advance(state).state }
}
/**
 * Parse frontmatter block (JavaScript/TypeScript code between --- markers)
 *
 * @param state - The current parser state
 * @returns An object containing the parsed frontmatter node and new state
 */
function parseFrontmatter(state) {
  const { state: s1 } = consume(state, 'FRONTMATTER_START')
  let value = ''
  let currentState = s1
  while (peek(currentState).type === 'FRONTMATTER_CONTENT') {
    const result = advance(currentState)
    value += result.token.value
    currentState = result.state
  }
  const { state: finalState } = consume(currentState, 'FRONTMATTER_END')
  return {
    node: {
      type: 'Frontmatter',
      value: value.trim(),
    },
    state: finalState,
  }
}
/**
 * Parse HTML/JSX element including attributes and children
 *
 * @param state - The current parser state
 * @returns An object containing the parsed element node and new state
 */
function parseElement(state) {
  const { state: s1 } = consume(state, 'HTML_TAG_OPEN')
  const { token: nameToken, state: s2 } = consume(s1, 'HTML_TAG_NAME')
  const name = nameToken.value
  const attributes = []
  let currentState = s2
  // Parse attributes
  while (
    peek(currentState).type !== 'HTML_TAG_CLOSE' &&
    peek(currentState).type !== 'HTML_TAG_SELF_CLOSE' &&
    !isAtEnd(currentState)
  ) {
    if (peek(currentState).type === 'HTML_ATTRIBUTE_NAME') {
      const attrResult = advance(currentState)
      const attrName = attrResult.token.value
      currentState = attrResult.state
      let attrValue = ''
      // Check if next token is the attribute value
      if (peek(currentState).type === 'HTML_ATTRIBUTE_VALUE') {
        const valueResult = advance(currentState)
        attrValue = valueResult.token.value
        currentState = valueResult.state
      } else if (peek(currentState).type === 'EXPRESSION_START') {
        // Handle dynamic attribute values like class={className}
        const exprResult = parseExpression(currentState)
        attrValue = exprResult.node
        currentState = exprResult.state
      }
      attributes.push({ name: attrName, value: attrValue })
    } else {
      currentState = advance(currentState).state // Skip unknown tokens in tag
    }
  }
  const selfClosing = peek(currentState).type === 'HTML_TAG_SELF_CLOSE'
  currentState = advance(currentState).state // Consume > or />
  const children = []
  if (!selfClosing) {
    // Parse children until closing tag
    while (!isAtEnd(currentState)) {
      if (
        peek(currentState).type === 'HTML_TAG_CLOSE' &&
        peek(currentState, 1)?.type === 'HTML_TAG_NAME' &&
        peek(currentState, 1)?.value === name
      ) {
        break
      }
      const childResult = parseNode(currentState)
      if (childResult.node) {
        children.push(childResult.node)
      }
      currentState = childResult.state
    }
  }
  return {
    node: {
      type: 'Element',
      name,
      attributes,
      children,
      selfClosing,
    },
    state: currentState,
  }
}
/**
 * Parse JavaScript expression within curly braces { }
 *
 * @param state - The current parser state
 * @returns An object containing the parsed expression node and new state
 */
function parseExpression(state) {
  const { state: s1 } = consume(state, 'EXPRESSION_START')
  let value = ''
  let currentState = s1
  while (peek(currentState).type === 'EXPRESSION_CONTENT') {
    const result = advance(currentState)
    value += result.token.value
    currentState = result.state
  }
  const { state: finalState } = consume(currentState, 'EXPRESSION_END')
  return {
    node: {
      type: 'Expression',
      value: value.trim(),
    },
    state: finalState,
  }
}
/**
 * Parse text content between elements
 *
 * @param state - The current parser state
 * @returns An object containing the parsed text node (or null if empty) and new state
 */
function parseText(state) {
  let value = ''
  let currentState = state
  while (peek(currentState).type === 'TEXT' && !isAtEnd(currentState)) {
    const result = advance(currentState)
    value += result.token.value
    currentState = result.state
  }
  // Only return text node if it has non-whitespace content
  const trimmed = value.trim()
  if (!trimmed) {
    return { node: null, state: currentState }
  }
  return {
    node: {
      type: 'Text',
      value,
    },
    state: currentState,
  }
}
// Immutable state helpers
/**
 * Look at a token without consuming it
 *
 * @param state - The current parser state
 * @param offset - How many tokens ahead to look (default: 0)
 * @returns The token at the specified position
 */
function peek(state, offset = 0) {
  const index = state.current + offset
  if (index >= state.tokens.length) {
    return state.tokens[state.tokens.length - 1]
  }
  return state.tokens[index]
}
/**
 * Consume the current token and advance to the next one
 *
 * @param state - The current parser state
 * @returns An object containing the consumed token and new state
 */
function advance(state) {
  if (isAtEnd(state)) {
    return { token: state.tokens[state.current], state }
  }
  return {
    token: state.tokens[state.current],
    state: { ...state, current: state.current + 1 },
  }
}
/**
 * Consume a token of a specific type or throw an error
 *
 * @param state - The current parser state
 * @param type - The expected token type
 * @returns An object containing the consumed token and new state
 * @throws Error if the current token doesn't match the expected type
 */
function consume(state, type) {
  const token = peek(state)
  if (token.type !== type) {
    throw new Error(`Expected ${type} but got ${token.type}`)
  }
  return advance(state)
}
/**
 * Check if we've reached the end of the token stream
 *
 * @param state - The current parser state
 * @returns True if at the end of the token stream
 */
function isAtEnd(state) {
  return peek(state).type === 'EOF'
}
//# sourceMappingURL=parser.js.map
