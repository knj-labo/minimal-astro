/**
 * Template helpers for pre-compiled templates
 */

// A simple helper to render attributes
export function renderAttrs(attrs: Record<string, any>): string {
  let result = '';
  for (const key in attrs) {
    const value = attrs[key];
    if (value === false || value === null || value === undefined) continue;
    if (value === true) {
      result += ` ${key}`;
    } else {
      result += ` ${key}="${String(value).replace(/"/g, '&quot;')}"`;
    }
  }
  return result;
}

// A simple helper to render a component
export async function renderComponent(component: any, props: any, slots: any): Promise<string> {
  if (typeof component.render !== 'function') {
    return '';
  }
  const { html } = await component.render(props, slots);
  return html || '';
}
