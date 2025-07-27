import { describe, expect, it } from 'vitest'
import { parse } from '../src/parser/index.js'

describe('パーサー', () => {
  it('空のファイルをパースできる', () => {
    const source = ''
    const ast = parse(source)

    expect(ast).toEqual({
      type: 'Program',
      children: [],
    })
  })

  it('HTMLのみをパースできる', () => {
    const source = '<div>Hello World</div>'
    const ast = parse(source)

    expect(ast).toEqual({
      type: 'Program',
      children: [
        {
          type: 'Element',
          name: 'div',
          attributes: [],
          selfClosing: false,
          children: [
            {
              type: 'Text',
              value: 'Hello World',
            },
          ],
        },
      ],
    })
  })

  it('Frontmatterのみをパースできる', () => {
    const source = `---
const title = 'Hello'
const description = 'World'
---`
    const ast = parse(source)

    expect(ast).toEqual({
      type: 'Program',
      children: [
        {
          type: 'Frontmatter',
          value: `const title = 'Hello'
const description = 'World'`,
        },
      ],
    })
  })

  it('Frontmatter + HTMLをパースできる', () => {
    const source = `---
const title = 'My Page'
---
<h1>Welcome</h1>
<p>This is a test</p>`
    const ast = parse(source)

    expect(ast).toEqual({
      type: 'Program',
      children: [
        {
          type: 'Frontmatter',
          value: "const title = 'My Page'",
        },
        {
          type: 'Element',
          name: 'h1',
          attributes: [],
          selfClosing: false,
          children: [
            {
              type: 'Text',
              value: 'Welcome',
            },
          ],
        },
        {
          type: 'Element',
          name: 'p',
          attributes: [],
          selfClosing: false,
          children: [
            {
              type: 'Text',
              value: 'This is a test',
            },
          ],
        },
      ],
    })
  })

  it('JS式を含むHTMLをパースできる', () => {
    const source = '<div>{count}</div>'
    const ast = parse(source)

    expect(ast).toEqual({
      type: 'Program',
      children: [
        {
          type: 'Element',
          name: 'div',
          attributes: [],
          selfClosing: false,
          children: [
            {
              type: 'Expression',
              value: 'count',
            },
          ],
        },
      ],
    })
  })

  it('ASTのスナップショットを生成する', () => {
    const source = `---
const items = ['apple', 'banana', 'orange']
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

    const ast = parse(source)
    expect(ast).toMatchSnapshot()
  })
})
