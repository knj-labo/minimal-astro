import { describe, expect, it } from 'vitest'
import { tokenize } from '../src/tokenizer/index.js'

describe('Tokenizer', () => {
  it('should tokenize simple HTML', () => {
    const source = '<div>Hello World</div>'
    const tokens = tokenize(source)

    expect(tokens).toMatchSnapshot()
  })

  it('should tokenize frontmatter', () => {
    const source = `---
const title = 'Hello'
---`
    const tokens = tokenize(source)

    expect(tokens).toMatchSnapshot()
  })
})
