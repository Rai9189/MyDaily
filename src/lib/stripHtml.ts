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
