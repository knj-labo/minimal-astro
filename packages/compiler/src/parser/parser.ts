import { tokenize } from '../tokenizer/index.js'
import type { Token } from '../tokenizer/types.js'
import type { AstroAST, AstroNode, ElementNode, ExpressionNode } from './types.js'

interface ParserState {
  tokens: Token[]
  current: number
}

export function parse(source: string): AstroAST {
  const tokens = tokenize(source)
  const initialState: ParserState = { tokens, current: 0 }
  const { children } = parseProgram(initialState)

  return {
    type: 'Program',
    children,
  }
}

function parseProgram(initialState: ParserState): { children: AstroNode[]; state: ParserState } {
  const children: AstroNode[] = []
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

function parseNode(state: ParserState): { node: AstroNode | null; state: ParserState } {
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

function parseFrontmatter(state: ParserState): { node: AstroNode; state: ParserState } {
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

function parseElement(state: ParserState): { node: ElementNode; state: ParserState } {
  const { state: s1 } = consume(state, 'HTML_TAG_OPEN')
  const { token: nameToken, state: s2 } = consume(s1, 'HTML_TAG_NAME')
  const name = nameToken.value

  const attributes: ElementNode['attributes'] = []
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

      let attrValue: string | ExpressionNode = ''

      // Skip whitespace and equals
      while (peek(currentState).type === 'TEXT' && peek(currentState).value.trim() === '') {
        currentState = advance(currentState).state
      }

      if (peek(currentState).value === '=') {
        currentState = advance(currentState).state // Skip =

        // Skip whitespace
        while (peek(currentState).type === 'TEXT' && peek(currentState).value.trim() === '') {
          currentState = advance(currentState).state
        }

        if (peek(currentState).type === 'HTML_ATTRIBUTE_VALUE') {
          const valueResult = advance(currentState)
          attrValue = valueResult.token.value
          currentState = valueResult.state
        } else if (peek(currentState).type === 'EXPRESSION_START') {
          const exprResult = parseExpression(currentState)
          attrValue = exprResult.node as ExpressionNode
          currentState = exprResult.state
        }
      }

      attributes.push({ name: attrName, value: attrValue })
    } else {
      currentState = advance(currentState).state // Skip unknown tokens in tag
    }
  }

  const selfClosing = peek(currentState).type === 'HTML_TAG_SELF_CLOSE'
  currentState = advance(currentState).state // Consume > or />

  const children: AstroNode[] = []

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

function parseExpression(state: ParserState): { node: ExpressionNode; state: ParserState } {
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

function parseText(state: ParserState): { node: AstroNode | null; state: ParserState } {
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
function peek(state: ParserState, offset = 0): Token {
  const index = state.current + offset
  if (index >= state.tokens.length) {
    return state.tokens[state.tokens.length - 1]
  }
  return state.tokens[index]
}

function advance(state: ParserState): { token: Token; state: ParserState } {
  if (isAtEnd(state)) {
    return { token: state.tokens[state.current], state }
  }

  return {
    token: state.tokens[state.current],
    state: { ...state, current: state.current + 1 },
  }
}

function consume(state: ParserState, type: string): { token: Token; state: ParserState } {
  const token = peek(state)
  if (token.type !== type) {
    throw new Error(`Expected ${type} but got ${token.type}`)
  }
  return advance(state)
}

function isAtEnd(state: ParserState): boolean {
  return peek(state).type === 'EOF'
}
