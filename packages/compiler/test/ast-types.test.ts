import { describe, expectTypeOf, it } from 'vitest'
import type {
  AstroAST,
  AstroNode,
  ElementNode,
  ExpressionNode,
  FrontmatterNode,
  TemplateNode,
  TextNode,
} from '../src/parser/ast.js'
import {
  isAstroAST,
  isElementNode,
  isExpressionNode,
  isFrontmatterNode,
  isTemplateNode,
  isTextNode,
} from '../src/parser/ast.js'

describe('AST型定義のテスト', () => {
  it('AstroASTの型が正しく定義されている', () => {
    const ast: AstroAST = {
      type: 'Program',
      children: [],
    }

    expectTypeOf(ast).toEqualTypeOf<AstroAST>()
    expectTypeOf(ast.type).toEqualTypeOf<'Program'>()
    expectTypeOf(ast.children).toEqualTypeOf<AstroNode[]>()
  })

  it('FrontmatterNodeの型が正しく定義されている', () => {
    const frontmatter: FrontmatterNode = {
      type: 'Frontmatter',
      value: "const title = 'Hello'",
    }

    expectTypeOf(frontmatter).toEqualTypeOf<FrontmatterNode>()
    expectTypeOf(frontmatter).toHaveProperty('type').toEqualTypeOf<'Frontmatter'>()
    expectTypeOf(frontmatter.type).toEqualTypeOf<'Frontmatter'>()
    expectTypeOf(frontmatter.value).toEqualTypeOf<string>()
  })

  it('TemplateNodeの型が正しく定義されている', () => {
    const template: TemplateNode = {
      type: 'Template',
      children: [],
    }

    expectTypeOf(template).toEqualTypeOf<TemplateNode>()
    expectTypeOf(template).toHaveProperty('type').toEqualTypeOf<'Template'>()
    expectTypeOf(template.type).toEqualTypeOf<'Template'>()
    expectTypeOf(template.children).toEqualTypeOf<AstroNode[]>()
  })

  it('ElementNodeの型が正しく定義されている', () => {
    const element: ElementNode = {
      type: 'Element',
      name: 'div',
      attributes: [
        { name: 'class', value: 'container' },
        { name: 'id', value: { type: 'Expression', value: 'dynamicId' } },
      ],
      children: [],
      selfClosing: false,
    }

    expectTypeOf(element).toEqualTypeOf<ElementNode>()
    expectTypeOf(element).toHaveProperty('type').toEqualTypeOf<'Element'>()
    expectTypeOf(element.name).toEqualTypeOf<string>()
    expectTypeOf(element.attributes[0].value).toEqualTypeOf<string | ExpressionNode>()
  })

  it('TextNodeの型が正しく定義されている', () => {
    const text: TextNode = {
      type: 'Text',
      value: 'Hello World',
    }

    expectTypeOf(text).toEqualTypeOf<TextNode>()
    expectTypeOf(text).toHaveProperty('type').toEqualTypeOf<'Text'>()
    expectTypeOf(text.type).toEqualTypeOf<'Text'>()
  })

  it('ExpressionNodeの型が正しく定義されている', () => {
    const expression: ExpressionNode = {
      type: 'Expression',
      value: 'count * 2',
    }

    expectTypeOf(expression).toEqualTypeOf<ExpressionNode>()
    expectTypeOf(expression).toHaveProperty('type').toEqualTypeOf<'Expression'>()
    expectTypeOf(expression.type).toEqualTypeOf<'Expression'>()
  })

  it('型ガード関数が正しく動作する', () => {
    const node: AstroNode = {
      type: 'Element',
      name: 'div',
      attributes: [],
      children: [],
      selfClosing: false,
    }

    if (isElementNode(node)) {
      expectTypeOf(node).toEqualTypeOf<ElementNode>()
      expectTypeOf(node.name).toEqualTypeOf<string>()
    }

    const program: AstroNode = {
      type: 'Program',
      children: [],
    }

    if (isAstroAST(program)) {
      expectTypeOf(program).toEqualTypeOf<AstroAST>()
    }
  })

  it('AstroNodeユニオン型が全てのノード型を含む', () => {
    const nodes: AstroNode[] = [
      { type: 'Program', children: [] },
      { type: 'Frontmatter', value: '' },
      { type: 'Template', children: [] },
      { type: 'Element', name: 'div', attributes: [], children: [], selfClosing: false },
      { type: 'Text', value: '' },
      { type: 'Expression', value: '' },
    ]

    for (const node of nodes) {
      expectTypeOf(node).toEqualTypeOf<AstroNode>()
    }
  })
})
