import { describe, expect, it } from 'vitest'
import { serializeElement, serializeText } from '../src/html-builder/serializer.js'
import type { ElementNode, TextNode } from '../src/parser/ast.js'

describe('serializer', () => {
  describe('serializeText', () => {
    it('プレーンテキストのシリアライズ', () => {
      const node: TextNode = {
        type: 'Text',
        value: 'Hello World',
      }
      expect(serializeText(node)).toBe('Hello World')
    })

    it('特殊文字を含むテキストのエスケープ', () => {
      const node: TextNode = {
        type: 'Text',
        value: '<script>alert("XSS")</script>',
      }
      expect(serializeText(node)).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
    })
  })

  describe('serializeElement', () => {
    it('属性付き要素のシリアライズ', () => {
      const node: ElementNode = {
        type: 'Element',
        name: 'div',
        attributes: [
          { name: 'class', value: 'container' },
          { name: 'id', value: 'main' },
        ],
        children: [
          {
            type: 'Text',
            value: 'Hello World',
          },
        ],
        selfClosing: false,
      }
      expect(serializeElement(node)).toBe('<div class="container" id="main">Hello World</div>')
    })

    it('ネストされた要素のシリアライズ', () => {
      const node: ElementNode = {
        type: 'Element',
        name: 'article',
        attributes: [],
        children: [
          {
            type: 'Element',
            name: 'h1',
            attributes: [],
            children: [
              {
                type: 'Text',
                value: 'Title',
              },
            ],
            selfClosing: false,
          },
          {
            type: 'Element',
            name: 'p',
            attributes: [{ name: 'class', value: 'content' }],
            children: [
              {
                type: 'Text',
                value: 'This is a paragraph with ',
              },
              {
                type: 'Element',
                name: 'strong',
                attributes: [],
                children: [
                  {
                    type: 'Text',
                    value: 'bold text',
                  },
                ],
                selfClosing: false,
              },
              {
                type: 'Text',
                value: '.',
              },
            ],
            selfClosing: false,
          },
        ],
        selfClosing: false,
      }
      expect(serializeElement(node)).toBe(
        '<article><h1>Title</h1><p class="content">This is a paragraph with <strong>bold text</strong>.</p></article>',
      )
    })

    it('自己完結型タグのシリアライズ', () => {
      const node: ElementNode = {
        type: 'Element',
        name: 'img',
        attributes: [
          { name: 'src', value: '/image.png' },
          { name: 'alt', value: 'Test image' },
        ],
        children: [],
        selfClosing: true,
      }
      expect(serializeElement(node)).toBe('<img src="/image.png" alt="Test image" />')
    })

    it('動的な属性値（Expression）のシリアライズ', () => {
      const node: ElementNode = {
        type: 'Element',
        name: 'div',
        attributes: [
          { name: 'class', value: 'static-class' },
          {
            name: 'id',
            value: {
              type: 'Expression',
              value: 'dynamicId',
            },
          },
        ],
        children: [],
        selfClosing: false,
      }
      expect(serializeElement(node)).toBe('<div class="static-class" id="{dynamicId}"></div>')
    })

    it('特殊文字を含む属性値のエスケープ', () => {
      const node: ElementNode = {
        type: 'Element',
        name: 'button',
        attributes: [{ name: 'title', value: 'Click & "Save"' }],
        children: [
          {
            type: 'Text',
            value: 'Save',
          },
        ],
        selfClosing: false,
      }
      expect(serializeElement(node)).toBe(
        '<button title="Click &amp; &quot;Save&quot;">Save</button>',
      )
    })
  })
})
