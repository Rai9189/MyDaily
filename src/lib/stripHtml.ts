// Plain-text extraction from Tiptap HTML — kept out of RichTextEditor.tsx
// (which pulls in the whole editor) so callers that only need this string
// helper, like GlobalSearch, don't drag the editor into their bundle.
export function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BLOCK = /^(P|DIV|H[1-6]|BLOCKQUOTE|PRE|TR)$/;

/**
 * Multi-line plain text for card previews (render with `whitespace-pre-wrap`):
 * one line per paragraph/<br>, list markers kept ("• ", "1. ", "☑ "/"☐ " for
 * checklists) and nested lists indented. Raw whitespace inside the HTML source
 * collapses to a single space, as the browser renders it.
 */
export function htmlToPreviewText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines: string[] = [];
  let prefix = '';   // marker/indent for the next line
  let text = '';

  const flush = () => {
    const t = text.replace(/\s+/g, ' ').trim();
    text = '';
    if (!t) return;                           // keep a pending marker for the item's first text
    lines.push(prefix + t);
    prefix = ' '.repeat(prefix.length);       // further lines of the same item align under its text
  };

  const walk = (node: Node) => {
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) { text += child.textContent; return; }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as Element;

      if (el.tagName === 'BR') { flush(); return; }
      if (el.tagName === 'INPUT') return;     // checklist checkbox; state comes from data-checked
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        flush();
        const indent = ' '.repeat(prefix.length);
        let n = Number(el.getAttribute('start')) || 1;
        Array.from(el.children).forEach(li => {
          if (li.tagName !== 'LI') return;
          const marker = li.getAttribute('data-type') === 'taskItem'
            ? (li.getAttribute('data-checked') === 'true' ? '☑ ' : '☐ ')
            : el.tagName === 'OL' ? `${n++}. ` : '• ';
          prefix = indent + marker;
          walk(li);
          flush();
        });
        prefix = indent;
        return;
      }

      const block = BLOCK.test(el.tagName);
      if (block) flush();
      walk(el);
      if (block) flush();
    });
  };

  walk(doc.body);
  flush();
  return lines.join('\n');
}
