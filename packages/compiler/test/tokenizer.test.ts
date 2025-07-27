import { describe, expect, it } from 'vitest'
import { tokenize } from '../src/tokenizer/index.js'

describe('トークナイザー', () => {
  it('シンプルなHTMLをトークン化できる', () => {
    const source = '<div>Hello World</div>'
    const tokens = tokenize(source)

    expect(tokens).toMatchSnapshot()
  })

  it('Frontmatterをトークン化できる', () => {
    const source = `---
const title = 'Hello'
---`
    const tokens = tokenize(source)

    expect(tokens).toMatchSnapshot()
  })
})
