import { describe, expect, it } from 'vitest'
import { transformAstro } from '../src/transform.js'

describe('transformAstro', () => {
  it('基本的な.astroファイルの変換', () => {
    const code = '<h1>Hello World</h1>'
    const id = '/src/pages/index.astro'

    const result = transformAstro(code, id)

    expect(result.code).toContain('export default')
    expect(result.code).toContain('<h1>Hello World</h1>')
    expect(result.map).toBeNull()
  })

  it('フロントマター付きの.astroファイルの変換', () => {
    const code = `---
const title = "My Page"
---
<h1>{title}</h1>`
    const id = '/src/pages/about.astro'

    const result = transformAstro(code, id)

    expect(result.code).toContain('export default')
    expect(result.code).toContain('<h1>{title}</h1>')
    // フロントマターはHTMLに含まれない
    expect(result.code).not.toContain('const title')
  })

  it('複雑な構造の.astroファイルの変換', () => {
    const code = `---
const items = ['Apple', 'Banana', 'Orange']
---
<html>
  <head>
    <title>Fruit List</title>
  </head>
  <body>
    <h1>My Fruits</h1>
    <ul>
      {items.map(item => <li>{item}</li>)}
    </ul>
  </body>
</html>`
    const id = '/src/pages/fruits.astro'

    const result = transformAstro(code, id)

    expect(result.code).toContain('export default')
    expect(result.code).toContain('<html>')
    expect(result.code).toContain('<title>Fruit List</title>')
    expect(result.code).toContain('{items.map(item => <li>{item}</li>)}')
  })

  it('空の.astroファイルの変換', () => {
    const code = ''
    const id = '/src/pages/empty.astro'

    const result = transformAstro(code, id)

    expect(result.code).toBe('export default "";')
    expect(result.map).toBeNull()
  })

  it('特殊文字を含む.astroファイルの変換', () => {
    const code = '<p>This contains "quotes" and \'apostrophes\'</p>'
    const id = '/src/pages/special.astro'

    const result = transformAstro(code, id)

    expect(result.code).toContain('export default')
    // HTMLエスケープされ、さらにJSON.stringifyでエスケープされる
    expect(result.code).toContain('&quot;quotes&quot;')
    expect(result.code).toContain('&#x27;apostrophes&#x27;')
  })
})
