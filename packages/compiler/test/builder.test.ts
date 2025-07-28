import { describe, expect, it } from 'vitest'
import { buildHTML } from '../src/html-builder/builder.js'
import type { AstroAST } from '../src/parser/ast.js'

describe('buildHTML', () => {
  it('空のAST → ""を返す', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [],
    }
    expect(buildHTML(ast)).toBe('')
  })

  it('単一のテキスト → "Hello"を返す', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [
        {
          type: 'Text',
          value: 'Hello',
        },
      ],
    }
    expect(buildHTML(ast)).toBe('Hello')
  })

  it('単一の要素 → <p>Hello</p>', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [
        {
          type: 'Element',
          name: 'p',
          attributes: [],
          children: [
            {
              type: 'Text',
              value: 'Hello',
            },
          ],
          selfClosing: false,
        },
      ],
    }
    expect(buildHTML(ast)).toBe('<p>Hello</p>')
  })

  it('ネストされた要素 → <div><span>x</span></div>', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [
        {
          type: 'Element',
          name: 'div',
          attributes: [],
          children: [
            {
              type: 'Element',
              name: 'span',
              attributes: [],
              children: [
                {
                  type: 'Text',
                  value: 'x',
                },
              ],
              selfClosing: false,
            },
          ],
          selfClosing: false,
        },
      ],
    }
    expect(buildHTML(ast)).toBe('<div><span>x</span></div>')
  })

  it('自己完結型要素 → <img src="a.png">', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [
        {
          type: 'Element',
          name: 'img',
          attributes: [{ name: 'src', value: 'a.png' }],
          children: [],
          selfClosing: false, // Even if false, img should be self-closing
        },
      ],
    }
    expect(buildHTML(ast)).toBe('<img src="a.png" />')
  })

  it('フロントマターを含むASTはフロントマターを無視する', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [
        {
          type: 'Frontmatter',
          value: 'const title = "Hello"',
        },
        {
          type: 'Element',
          name: 'h1',
          attributes: [],
          children: [
            {
              type: 'Text',
              value: 'Hello World',
            },
          ],
          selfClosing: false,
        },
      ],
    }
    expect(buildHTML(ast)).toBe('<h1>Hello World</h1>')
  })

  it('Expressionノードを含むAST', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [
        {
          type: 'Element',
          name: 'div',
          attributes: [],
          children: [
            {
              type: 'Text',
              value: 'Count: ',
            },
            {
              type: 'Expression',
              value: 'count',
            },
          ],
          selfClosing: false,
        },
      ],
    }
    expect(buildHTML(ast)).toBe('<div>Count: {count}</div>')
  })

  it('Templateノードを含むAST', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [
        {
          type: 'Template',
          children: [
            {
              type: 'Element',
              name: 'main',
              attributes: [],
              children: [
                {
                  type: 'Text',
                  value: 'Content',
                },
              ],
              selfClosing: false,
            },
          ],
        },
      ],
    }
    expect(buildHTML(ast)).toBe('<main>Content</main>')
  })

  it('複雑なASTのスナップショット', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [
        {
          type: 'Frontmatter',
          value: 'const title = "My Page"',
        },
        {
          type: 'Element',
          name: 'html',
          attributes: [{ name: 'lang', value: 'ja' }],
          children: [
            {
              type: 'Element',
              name: 'head',
              attributes: [],
              children: [
                {
                  type: 'Element',
                  name: 'title',
                  attributes: [],
                  children: [
                    {
                      type: 'Expression',
                      value: 'title',
                    },
                  ],
                  selfClosing: false,
                },
                {
                  type: 'Element',
                  name: 'meta',
                  attributes: [{ name: 'charset', value: 'UTF-8' }],
                  children: [],
                  selfClosing: true,
                },
              ],
              selfClosing: false,
            },
            {
              type: 'Element',
              name: 'body',
              attributes: [],
              children: [
                {
                  type: 'Element',
                  name: 'h1',
                  attributes: [{ name: 'class', value: 'heading' }],
                  children: [
                    {
                      type: 'Text',
                      value: 'Welcome to ',
                    },
                    {
                      type: 'Expression',
                      value: 'title',
                    },
                  ],
                  selfClosing: false,
                },
                {
                  type: 'Element',
                  name: 'p',
                  attributes: [],
                  children: [
                    {
                      type: 'Text',
                      value: 'This is a <test> of HTML escaping & special "characters".',
                    },
                  ],
                  selfClosing: false,
                },
                {
                  type: 'Element',
                  name: 'img',
                  attributes: [
                    { name: 'src', value: '/image.png' },
                    { name: 'alt', value: 'Test Image' },
                  ],
                  children: [],
                  selfClosing: false,
                },
              ],
              selfClosing: false,
            },
          ],
          selfClosing: false,
        },
      ],
    }

    expect(buildHTML(ast)).toMatchSnapshot()
  })
})
