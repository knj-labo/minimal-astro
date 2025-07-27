import { describe, expect, it } from 'vitest'
import { is, parse, walk, walkAsync } from '../src/parser/index.js'

describe('パーサーユーティリティ', () => {
  it('ASTノードを正しく巡回できる', () => {
    const source = `---
const title = 'Test'
---
<div>Hello {name}</div>`

    const ast = parse(source)
    const visited: string[] = []

    walk(ast, node => {
      visited.push(node.type)
    })

    expect(visited).toEqual(['Program', 'Frontmatter', 'Element', 'Text', 'Expression'])
  })

  it('isヘルパーでノードタイプを正しく判定できる', () => {
    const source = `---
const title = 'Test'
---
<div>Hello {name}</div>`

    const ast = parse(source)
    const nodes: Array<{ type: string; result: boolean }> = []

    walk(ast, node => {
      if (node.type === 'Frontmatter') {
        nodes.push({ type: 'Frontmatter', result: is.frontmatter(node) })
      }
      if (node.type === 'Element') {
        nodes.push({ type: 'Element', result: is.element(node) })
        nodes.push({ type: 'Tag', result: is.tag(node) })
      }
      if (node.type === 'Text') {
        nodes.push({ type: 'Text', result: is.text(node) })
      }
      if (node.type === 'Expression') {
        nodes.push({ type: 'Expression', result: is.expression(node) })
      }
    })

    expect(nodes).toEqual([
      { type: 'Frontmatter', result: true },
      { type: 'Element', result: true },
      { type: 'Tag', result: true },
      { type: 'Text', result: true },
      { type: 'Expression', result: true },
    ])
  })

  it('型ガードヘルパーが正しく動作する', () => {
    const source = '<div>Hello {name}</div>'
    const ast = parse(source)

    walk(ast, node => {
      if (is.element(node)) {
        expect(node.type).toBe('Element')
        expect(node.name).toBe('div')
      }
      if (is.text(node)) {
        expect(node.type).toBe('Text')
        expect(node.value).toBe('Hello ')
      }
      if (is.expression(node)) {
        expect(node.type).toBe('Expression')
        expect(node.value).toBe('name')
      }
    })
  })

  it('非同期ウォーカーが正しく動作する', async () => {
    const source = '<div>Hello {name}</div>'
    const ast = parse(source)
    const visited: string[] = []

    await walkAsync(ast, async node => {
      // 非同期処理のシミュレーション
      await new Promise(resolve => setTimeout(resolve, 1))
      visited.push(node.type)
    })

    expect(visited).toEqual(['Program', 'Element', 'Text', 'Expression'])
  })

  it('親ノードとプロパティ情報が正しく渡される', () => {
    const source = '<div>Hello</div>'
    const ast = parse(source)
    const nodeInfo: Array<{ type: string; parentType?: string; prop?: string }> = []

    walk(ast, (node, parent, prop) => {
      nodeInfo.push({
        type: node.type,
        parentType: parent?.type,
        prop,
      })
    })

    expect(nodeInfo).toEqual([
      { type: 'Program', parentType: undefined, prop: undefined },
      { type: 'Element', parentType: 'Program', prop: 'children' },
      { type: 'Text', parentType: 'Element', prop: 'children' },
    ])
  })
})
