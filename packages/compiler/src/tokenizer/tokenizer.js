export function tokenize(source) {
  const tokens = []
  let current = 0
  let line = 1
  let col = 1
  function advance(count = 1) {
    for (let i = 0; i < count; i++) {
      if (source[current] === '\n') {
        line++
        col = 1
      } else {
        col++
      }
      current++
    }
  }
  function peek(offset = 0) {
    return source[current + offset] ?? ''
  }
  function match(pattern) {
    return source.slice(current, current + pattern.length) === pattern
  }
  function addToken(type, value) {
    tokens.push({ type, value, line, col })
  }
  // Check for frontmatter at the start
  if (match('---') && current === 0) {
    addToken('FRONTMATTER_START', '---')
    advance(3)
    // Skip newline after opening ---
    if (peek() === '\n') {
      advance()
    }
    // Collect frontmatter content
    let content = ''
    while (current < source.length) {
      // Check for closing ---
      if (peek() === '\n' || current === 0) {
        const nextLineStart = peek() === '\n' ? current + 1 : current
        if (
          source.slice(nextLineStart, nextLineStart + 3) === '---' &&
          (source[nextLineStart + 3] === '\n' || source[nextLineStart + 3] === undefined)
        ) {
          if (content) {
            addToken('FRONTMATTER_CONTENT', content.trim())
          }
          if (peek() === '\n') advance()
          addToken('FRONTMATTER_END', '---')
          advance(3)
          if (peek() === '\n') advance()
          break
        }
      }
      content += peek()
      advance()
    }
  }
  // Main tokenization loop
  while (current < source.length) {
    const char = peek()
    // Skip whitespace between elements
    if (char === ' ' || char === '\t' || char === '\n') {
      advance()
      continue
    }
    // HTML end tag
    if (match('</')) {
      addToken('HTML_TAG_CLOSE', '</')
      advance(2)
      let tagName = ''
      while (current < source.length && /[a-zA-Z0-9-]/.test(peek())) {
        tagName += peek()
        advance()
      }
      addToken('HTML_TAG_NAME', tagName)
      // Skip to >
      while (current < source.length && peek() !== '>') {
        advance()
      }
      if (peek() === '>') {
        addToken('HTML_TAG_CLOSE', '>')
        advance()
      }
      continue
    }
    // HTML start tag
    if (char === '<' && /[a-zA-Z]/.test(peek(1))) {
      addToken('HTML_TAG_OPEN', '<')
      advance()
      let tagName = ''
      while (current < source.length && /[a-zA-Z0-9-]/.test(peek())) {
        tagName += peek()
        advance()
      }
      addToken('HTML_TAG_NAME', tagName)
      // Parse attributes
      while (current < source.length && peek() !== '>' && !match('/>')) {
        // Skip whitespace
        if (peek() === ' ' || peek() === '\t') {
          advance()
          continue
        }
        // Attribute name
        if (/[a-zA-Z]/.test(peek())) {
          let attrName = ''
          while (current < source.length && /[a-zA-Z0-9-:]/.test(peek())) {
            attrName += peek()
            advance()
          }
          addToken('HTML_ATTRIBUTE_NAME', attrName)
          // Skip whitespace and =
          while (peek() === ' ' || peek() === '\t') advance()
          if (peek() === '=') {
            advance()
            while (peek() === ' ' || peek() === '\t') advance()
            // Attribute value
            if (peek() === '"' || peek() === "'") {
              const quote = peek()
              advance() // Skip opening quote
              let value = ''
              while (current < source.length && peek() !== quote) {
                value += peek()
                advance()
              }
              advance() // Skip closing quote
              addToken('HTML_ATTRIBUTE_VALUE', value)
            }
          }
        } else {
          advance()
        }
      }
      // Self-closing or regular close
      if (match('/>')) {
        addToken('HTML_TAG_SELF_CLOSE', '/>')
        advance(2)
      } else if (peek() === '>') {
        addToken('HTML_TAG_CLOSE', '>')
        advance()
      }
      continue
    }
    // Expression
    if (char === '{') {
      addToken('EXPRESSION_START', '{')
      advance()
      let depth = 1
      let content = ''
      while (current < source.length && depth > 0) {
        if (peek() === '{') {
          depth++
          content += peek()
          advance()
        } else if (peek() === '}') {
          depth--
          if (depth === 0) {
            if (content) {
              addToken('EXPRESSION_CONTENT', content)
            }
            addToken('EXPRESSION_END', '}')
            advance()
          } else {
            content += peek()
            advance()
          }
        } else {
          content += peek()
          advance()
        }
      }
      continue
    }
    // Text content
    let text = ''
    while (current < source.length && peek() !== '<' && peek() !== '{' && peek() !== '}') {
      text += peek()
      advance()
    }
    if (text.trim()) {
      addToken('TEXT', text)
    }
  }
  addToken('EOF', '')
  return tokens
}
//# sourceMappingURL=tokenizer.js.map
