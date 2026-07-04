/**
 * Allowlist sanitizer for stored formulation HTML (TipTap StarterKit output)
 * before it is injected into the agreement document via dangerouslySetInnerHTML.
 *
 * Dependency-free: parses into a detached document (no scripts run on parse),
 * drops dangerous elements, unwraps unknown elements (keeping their text), and
 * strips every attribute — so no `on*` handlers, `href`, `src` or styles
 * survive. This guards the render path regardless of when server-side
 * sanitization on write (Watson W5) lands.
 */
const ALLOWED = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'S',
  'U',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'BLOCKQUOTE',
  'CODE',
  'PRE',
]);

const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'HEAD']);

function clean(node: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      clean(el); // post-order: sanitize descendants first
      if (DROP.has(el.tagName)) {
        el.remove();
      } else if (ALLOWED.has(el.tagName)) {
        for (const attr of Array.from(el.attributes)) {
          el.removeAttribute(attr.name);
        }
      } else {
        el.replaceWith(...Array.from(el.childNodes)); // unwrap unknown tags, keep text
      }
    } else if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
    }
  }
}

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  clean(doc.body);
  return doc.body.innerHTML;
}
