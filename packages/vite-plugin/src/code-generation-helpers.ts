/**
 * Code generation helpers for transform.ts
 * These helpers generate JavaScript code using template literals
 * to avoid string concatenation issues
 */

import type { FragmentNode, FrontmatterNode } from '@minimal-astro/types/ast';

/**
 * Generate the processAstNode function code
 */
export function generateProcessAstNodeFunction(): string {
  return `
    async function processAstNode(node, context) {
      if (node.type === 'Expression') {
        try {
          const value = evaluateExpression(node.code, context);
          return { type: 'Text', value: String(value) };
        } catch (e) {
          return { type: 'Text', value: '' };
        }
      }
      
      // Handle Component nodes
      if (node.type === 'Component') {
        const Component = components[node.tag];
        const componentType = componentTypes[node.tag] || 'astro';
        
        if (Component) {
          // Process component attributes
          const props = {};
          let hasClientDirective = false;
          
          if (node.attrs) {
            for (const attr of node.attrs) {
              let value = attr.value;
              // Check for client directives
              if (attr.name.startsWith('client:')) {
                hasClientDirective = true;
                props[attr.name] = value || true;
                continue;
              }
              // Evaluate expression attributes
              if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
                try {
                  const exprCode = value.slice(1, -1);
                  value = evaluateExpression(exprCode, context);
                } catch (e) {
                  // Keep original value on error
                }
              }
              props[attr.name] = value;
            }
          }
          
          // Handle different component types
          if (componentType === 'astro' && typeof Component.render === 'function') {
            // Astro component - handle slots
            const slotFunction = async () => {
              if (!node.children || node.children.length === 0) return '';
              
              const childContext = { ...context };
              const processedChildren = [];
              
              for (const child of node.children) {
                const processed = await processAstNode(child, childContext);
                if (processed.type === 'Text' && !processed.value.trim()) continue;
                processedChildren.push(processed);
              }
              
              const html = buildHtml({ type: 'Fragment', children: processedChildren }, {
                prettyPrint: false,
                evaluateExpressions: false,
                escapeHtml: false
              });
              return html;
            };
            
            const componentAstro = {
              ...context.Astro,
              props: props,
              slots: { default: slotFunction },
            };
            
            const result = await Component.render({ ...props, Astro: componentAstro });
            return { type: 'RawHTML', value: result.html || '' };
          } else {
            // Framework component (React/Vue/Svelte) - for now, just render placeholder
            // TODO: Implement proper SSR for framework components
            const componentId = \`\${node.tag}-\${Math.random().toString(36).slice(2, 9)}\`;
            
            if (hasClientDirective) {
              // If it has a client directive, wrap in astro-island for hydration
              const directive = node.attrs.find(attr => attr.name.startsWith('client:'))?.name.replace('client:', '');
              const propsJson = JSON.stringify(props).replace(/"/g, '&quot;');
              
              return { 
                type: 'RawHTML', 
                value: \`<astro-island uid="\${componentId}" component-export="\${node.tag}" component-props="\${propsJson}" client-directive="\${directive}">\`
              };
            } else {
              // No client directive - just a placeholder for now
              return { type: 'RawHTML', value: \`<!-- \${node.tag} (SSR not implemented) -->\` };
            }
          }
        } else {
          // Component not found - will return comment
        }
        // If component not found, return comment
        return { type: 'Text', value: \`<!-- Component: \${node.tag} -->\` };
      }
      
      // Handle slot elements
      if (node.type === 'Element' && node.tag === 'slot') {
        const slotName = node.attrs?.find(attr => attr.name === 'name')?.value || 'default';
        if (context.Astro?.slots && typeof context.Astro.slots[slotName] === 'function') {
          const slotContent = await context.Astro.slots[slotName]();
          return { type: 'RawHTML', value: slotContent };
        }
        // Return empty if no slot content
        return { type: 'Text', value: '' };
      }
      
      // Process element/component attributes
      if (node.type === 'Element' && node.attrs) {
        node.attrs = await Promise.all(node.attrs.map(async attr => {
          // Check if attribute value contains an expression
          if (typeof attr.value === 'string' && attr.value.startsWith('{') && attr.value.endsWith('}')) {
            try {
              const exprCode = attr.value.slice(1, -1);
              const value = evaluateExpression(exprCode, context);
              return { ...attr, value: String(value) };
            } catch (_e) {
              return attr;
            }
          }
          return attr;
        }));
      }
      
      // Process children recursively
      if (node.children) {
        node.children = await Promise.all(node.children.map(child => processAstNode(child, context)));
      }
      
      return node;
    }`;
}

/**
 * Generate code to extract frontmatter variables into context
 */
export function generateFrontmatterContext(frontmatterCode: string): string {
  if (!frontmatterCode) return '';

  // Match regular variable declarations
  const varMatches = frontmatterCode.match(/(?:const|let|var)\s+(\w+)/g) || [];
  const destructureMatches = frontmatterCode.match(/(?:const|let|var)\s*\{([^}]+)\}\s*=/g) || [];

  const contextSetters: string[] = [];

  // Process regular variables
  for (const match of varMatches) {
    const varName = match.replace(/(?:const|let|var)\s+/, '');
    contextSetters.push(`    try { evalContext['${varName}'] = ${varName}; } catch(e) {}`);
  }

  // Process destructured variables
  for (const match of destructureMatches) {
    const varsSection = match.match(/\{([^}]+)\}/)?.[1];
    if (varsSection) {
      const vars = varsSection
        .split(',')
        .map((v) => {
          const trimmed = v.trim();
          const varName = trimmed.split(/[:=]/)[0].trim();
          return varName;
        })
        .filter((v) => v);

      for (const varName of vars) {
        contextSetters.push(`    try { evalContext['${varName}'] = ${varName}; } catch(e) {}`);
      }
    }
  }

  return contextSetters.join('\n');
}

/**
 * Generate the hydration script for client-side components
 */
export function generateHydrationScript(
  componentTypes: Record<string, string>,
  componentPaths: Record<string, string>
): string {
  return `
<script type="module" src="/_astro/client-hydration.js"></script>
<script type="module">
import { initHydration } from '/_astro/client-hydration.js';
initHydration({
  componentTypes: ${JSON.stringify(componentTypes)},
  componentPaths: ${JSON.stringify(componentPaths)},
  dev: true,
});
</script>`;
}

/**
 * Generate the complete render function
 */
export function generateRenderFunction(options: {
  frontmatterCode: string;
  templateAst: FragmentNode;
  prettyPrint: boolean;
  hasClientComponents: boolean;
  componentTypes: Record<string, string>;
  componentPaths: Record<string, string>;
}): string {
  const {
    frontmatterCode,
    templateAst,
    prettyPrint,
    hasClientComponents,
    componentTypes,
    componentPaths,
  } = options;

  const frontmatterContext = generateFrontmatterContext(frontmatterCode);
  const processAstNode = generateProcessAstNodeFunction();

  return `
  // Extract Astro from props or create default
  const Astro = props.Astro || {
    props: props,
    request: {},
    params: {},
    url: new URL("http://localhost:3000/"),
    slots: {}
  };
  // Ensure props are accessible via Astro.props
  if (!Astro.props) Astro.props = props;

  // Frontmatter execution
  ${frontmatterCode}

  // Build HTML dynamically with Astro context
  try {
    // Process AST to replace expressions and render components
    ${processAstNode}
    
    // Create context object with all variables in scope
    const evalContext = { Astro };

    // Add frontmatter variables to context
${frontmatterContext}
    
    // Clone the template AST and process expressions
    const processedAst = JSON.parse(JSON.stringify(${JSON.stringify(templateAst)}));
    // Pass Astro context directly to processAstNode
    const fullContext = { ...evalContext, Astro };
    // Process the AST - handle Fragment specially
    if (processedAst.type === "Fragment" && processedAst.children) {
      processedAst.children = await Promise.all(
        processedAst.children.map(child => processAstNode(child, fullContext))
      );
    } else {
      processedAst = await processAstNode(processedAst, fullContext);
    }
    
    let html = buildHtml(processedAst, {
      prettyPrint: ${prettyPrint},
      evaluateExpressions: false,
      escapeHtml: false
    });
    
    
    // Add hydration script if there are any client components
    const hasClientComponents = ${hasClientComponents};
    
    
    if (hasClientComponents && html.includes('astro-island')) {
      // Use external hydration script for better caching
      const hydrationScript = \`${generateHydrationScript(componentTypes, componentPaths)}\`;
      
      // Inject script before closing body tag
      if (html.includes('</body>')) {
        html = html.replace('</body>', hydrationScript + '</body>');
      } else {
        html += hydrationScript;
      }
    }
    
    return { html };
  } catch (error) {
    // Failed to build HTML
    return { html: \`Error: \${error.message}\` };
  }`;
}
