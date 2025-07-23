import { describe, expect, it } from 'bun:test';
import type {
  ComponentNode,
  ElementNode,
  ExpressionNode,
  FragmentNode,
  FrontmatterNode,
  TextNode,
} from '@minimal-astro/types/ast';
import { parseAstro } from '../../src/parser.js';

describe('Parser', () => {
  describe('Basic Parsing', () => {
    it('should parse simple text', () => {
      const source = 'Hello World';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      expect(result.ast.type).toBe('Fragment');
      expect(result.ast.children).toHaveLength(1);

      const textNode = result.ast.children[0] as TextNode;
      expect(textNode.type).toBe('Text');
      expect(textNode.value).toBe('Hello World');
    });

    it('should parse HTML elements', () => {
      const source = '<div>content</div>';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const element = result.ast.children[0] as ElementNode;
      expect(element.type).toBe('Element');
      expect(element.tag).toBe('div');
      expect(element.children).toHaveLength(1);

      const textChild = element.children[0] as TextNode;
      expect(textChild.type).toBe('Text');
      expect(textChild.value).toBe('content');
    });

    it('should parse self-closing elements', () => {
      const source = "<img src='test.jpg' />";
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const element = result.ast.children[0] as ElementNode;
      expect(element.type).toBe('Element');
      expect(element.tag).toBe('img');
      expect(element.selfClosing).toBe(true);
    });
  });

  describe('Frontmatter Parsing', () => {
    it('should parse frontmatter', () => {
      const source = "---\nconst title = 'Test';\n---\n<h1>Title</h1>";
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      expect(result.ast.children.length).toBeGreaterThanOrEqual(2);

      const frontmatter = result.ast.children[0] as FrontmatterNode;
      expect(frontmatter.type).toBe('Frontmatter');
      expect(frontmatter.code).toContain("const title = 'Test';");

      // Should also have the h1 element
      const h1Element = result.ast.children.find(
        (child) => child.type === 'Element' && (child as ElementNode).tag === 'h1'
      );
      expect(h1Element).toBeDefined();
    });

    it('should handle empty frontmatter', () => {
      const source = '---\n---\n<h1>Title</h1>';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const frontmatter = result.ast.children[0] as FrontmatterNode;
      expect(frontmatter.type).toBe('Frontmatter');
    });
  });

  describe('Expression Parsing', () => {
    it('should parse simple expressions', () => {
      const source = '<h1>{title}</h1>';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const element = result.ast.children[0] as ElementNode;
      const expression = element.children[0] as ExpressionNode;

      expect(expression.type).toBe('Expression');
      expect(expression.code).toBe('title');
    });

    it('should parse complex expressions', () => {
      const source = "<p>{user?.name || 'Anonymous'}</p>";
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const element = result.ast.children[0] as ElementNode;
      const expression = element.children[0] as ExpressionNode;

      expect(expression.type).toBe('Expression');
      expect(expression.code).toBe("user?.name || 'Anonymous'");
    });
  });

  describe('Component Parsing', () => {
    it('should recognize components (PascalCase)', () => {
      const source = '<Counter initialCount={0} />';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const component = result.ast.children[0] as ComponentNode;
      expect(component.type).toBe('Component');
      expect(component.tag).toBe('Counter');
      expect(component.selfClosing).toBe(true);
    });

    it('should parse component attributes', () => {
      const source = '<Counter initialCount={42} client:visible />';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const component = result.ast.children[0] as ComponentNode;
      expect(component.attrs).toHaveLength(2);

      // Check attributes are parsed
      const attrNames = component.attrs.map((attr) => attr.name);
      expect(attrNames).toContain('initialCount');
      expect(attrNames).toContain('client:visible');
    });

    it('should handle component children', () => {
      const source = '<Layout><h1>Title</h1></Layout>';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const component = result.ast.children[0] as ComponentNode;
      expect(component.type).toBe('Component');
      expect(component.tag).toBe('Layout');
      expect(component.children).toHaveLength(1);

      const childElement = component.children[0] as ElementNode;
      expect(childElement.type).toBe('Element');
      expect(childElement.tag).toBe('h1');
    });
  });

  describe('Attribute Parsing', () => {
    it('should parse boolean attributes', () => {
      const source = '<input disabled />';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const element = result.ast.children[0] as ElementNode;
      const disabledAttr = element.attrs.find((attr) => attr.name === 'disabled');
      expect(disabledAttr?.value).toBe(true);
    });

    it('should parse string attributes', () => {
      const source = '<div class="container" id="main"></div>';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const element = result.ast.children[0] as ElementNode;

      const classAttr = element.attrs.find((attr) => attr.name === 'class');
      expect(classAttr?.value).toBe('container');

      const idAttr = element.attrs.find((attr) => attr.name === 'id');
      expect(idAttr?.value).toBe('main');
    });

    it('should parse expression attributes', () => {
      const source = '<div class={className} data-count={count}></div>';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const element = result.ast.children[0] as ElementNode;
      expect(element.attrs.length).toBeGreaterThan(0);
    });
  });

  describe('Void Elements', () => {
    it('should handle void elements correctly', () => {
      const voidElements = ['br', 'hr', 'img', 'input', 'meta', 'link'];

      for (const tag of voidElements) {
        const source = `<${tag}>`;
        const result = parseAstro(source);

        expect(result.diagnostics).toHaveLength(0);
        const element = result.ast.children[0] as ElementNode;
        expect(element.tag).toBe(tag);
        expect(element.children).toHaveLength(0);
      }
    });
  });

  describe('Nested Elements', () => {
    it('should parse nested HTML elements', () => {
      const source = '<div><p><strong>Bold text</strong></p></div>';
      const result = parseAstro(source);

      expect(result.diagnostics).toHaveLength(0);
      const div = result.ast.children[0] as ElementNode;
      expect(div.tag).toBe('div');

      const p = div.children[0] as ElementNode;
      expect(p.tag).toBe('p');

      const strong = p.children[0] as ElementNode;
      expect(strong.tag).toBe('strong');

      const text = strong.children[0] as TextNode;
      expect(text.value).toBe('Bold text');
    });
  });

  describe('Error Handling', () => {
    it('should handle unclosed tags', () => {
      const source = '<div><p>Unclosed paragraph</div>';
      const result = parseAstro(source);

      // Should have diagnostics but not crash
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.ast.type).toBe('Fragment');
    });

    it('should handle mismatched tags', () => {
      const source = '<div></span>';
      const result = parseAstro(source);

      // Should have diagnostics for mismatched tag
      expect(result.diagnostics.length).toBeGreaterThan(0);
      const hasMismatchError = result.diagnostics.some((d) => d.code === 'mismatched-tag');
      expect(hasMismatchError).toBe(true);
    });

    it('should handle duplicate client directives', () => {
      const source = '<Counter client:load client:load />';
      const result = parseAstro(source);

      // Should have warning for duplicate directive
      const hasDuplicateWarning = result.diagnostics.some(
        (d) => d.code === 'duplicate-directive' && d.severity === 'warning'
      );
      expect(hasDuplicateWarning).toBe(true);
    });
  });

  describe('Complex Documents', () => {
    it('should parse complete .astro file', () => {
      const source = `---
const title = "Test Page";
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <title>{title}</title>
  </head>
  <body>
    <h1>{title}</h1>
    <Counter initialCount={42} client:visible />
    <p>Simple content without complex JSX</p>
  </body>
</html>`;

      const result = parseAstro(source, { filename: 'test.astro' });

      expect(result.diagnostics).toHaveLength(0);
      expect(result.ast.children.length).toBeGreaterThan(0);

      // Should have frontmatter
      const frontmatter = result.ast.children.find((child) => child.type === 'Frontmatter');
      expect(frontmatter).toBeDefined();

      // Should have HTML structure
      const htmlElement = result.ast.children.find(
        (child) => child.type === 'Element' && (child as ElementNode).tag === 'html'
      );
      expect(htmlElement).toBeDefined();
    });
  });
});
