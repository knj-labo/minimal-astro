import { describe, expect, it } from 'vitest'
import { escapeHtml } from '../src/html-builder/escape.js'

describe('escapeHtml', () => {
  it('基本的なHTMLエスケープ', () => {
    const input = '<div>Hello & "World"</div>'
    const expected = '&lt;div&gt;Hello &amp; &quot;World&quot;&lt;/div&gt;'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('空文字列の処理', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('エスケープ不要な文字列', () => {
    const input = 'Hello World 123 こんにちは'
    expect(escapeHtml(input)).toBe(input)
  })

  it('全ての特殊文字を含む文字列', () => {
    const input = '<>&"\''
    const expected = '&lt;&gt;&amp;&quot;&#x27;'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('既にエスケープされた文字列の処理', () => {
    // Already escaped entities should be double-escaped to preserve literal text
    const input = '&lt;div&gt; &amp; &quot;test&quot;'
    const expected = '&amp;lt;div&amp;gt; &amp;amp; &amp;quot;test&amp;quot;'
    expect(escapeHtml(input)).toBe(expected)
  })
})
