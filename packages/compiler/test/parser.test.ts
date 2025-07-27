import { describe, expect, it } from 'vitest'
import { parse } from '../src/parser/index.js'

describe('Parser', () => {
  it('should parse empty file', () => {
    const source = ''
    const ast = parse(source)

    expect(ast).toEqual({
      type: 'Program',
      children: [],
    })
  })

  it('should parse HTML only', () => {
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

  it('should parse frontmatter only', () => {
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

  it('should parse frontmatter + HTML', () => {
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

  it('should parse HTML with JS expressions', () => {
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

  it('should generate AST snapshot', () => {
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
