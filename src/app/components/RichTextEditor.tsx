// src/app/components/RichTextEditor.tsx
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Extension } from '@tiptap/core';
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Palette, Type,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ─── FontSize extension ───────────────────────────────────────────────────────
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize || null,
          renderHTML: (attrs: Record<string, any>) => {
            if (!attrs.fontSize) return {};
            return { style: `font-size: ${attrs.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

// ─── Color Picker ─────────────────────────────────────────────────────────────
const COLORS = [
  '#000000', '#374151', '#6b7280', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff', '#fca5a5', '#bfdbfe', '#bbf7d0', '#fef08a',
];

function ColorPicker({ onSelect, current }: { onSelect: (c: string) => void; current: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        title="Text color"
        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex flex-col items-center gap-0.5"
      >
        <Palette size={14} />
        <div className="w-3.5 h-1 rounded-sm border border-border" style={{ backgroundColor: current || '#000000' }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 p-2 bg-white dark:bg-card border border-border rounded-lg shadow-lg grid grid-cols-5 gap-1 w-[130px]">
          {COLORS.map(c => (
            <button
              key={c} type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(c); setOpen(false); }}
              className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <label className="col-span-5 mt-1 cursor-pointer">
            <span className="text-xs text-muted-foreground block text-center mb-1">Custom</span>
            <input
              type="color"
              defaultValue={current || '#000000'}
              onChange={(e) => { onSelect(e.target.value); setOpen(false); }}
              className="w-full h-6 cursor-pointer rounded border border-border"
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Font Size Selector ───────────────────────────────────────────────────────
const SIZES = [
  { label: 'Small',  value: '12px' },
  { label: 'Normal', value: '14px' },
  { label: 'Medium', value: '16px' },
  { label: 'Large',  value: '20px' },
  { label: 'XL',     value: '24px' },
  { label: 'XXL',    value: '32px' },
];

function SizeSelector({ onSelect }: { onSelect: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        title="Font size"
        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-0.5"
      >
        <Type size={14} />
        <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-60">
          <path d="M4 6L1 2h6z" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[100px]">
          {SIZES.map(s => (
            <button
              key={s.value} type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(s.value); setOpen(false); }}
              className="w-full px-3 py-1.5 text-left hover:bg-muted transition-colors flex items-center justify-between gap-4"
            >
              <span className="text-muted-foreground text-xs">{s.label}</span>
              <span style={{ fontSize: Math.min(parseInt(s.value), 18) + 'px' }} className="text-foreground font-medium leading-tight">A</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 self-center" />;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function Toolbar({
  editor,
  onColorSelect,
  currentColor,
}: {
  editor: ReturnType<typeof useEditor>;
  onColorSelect: (c: string) => void;
  currentColor: string;
}) {
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      bold:        ctx.editor.isActive('bold'),
      italic:      ctx.editor.isActive('italic'),
      underline:   ctx.editor.isActive('underline'),
      bulletList:  ctx.editor.isActive('bulletList'),
      orderedList: ctx.editor.isActive('orderedList'),
    }),
  });

  if (!editor || !editorState) return null;

  const btnClass = (active: boolean) =>
    `p-1.5 rounded-md transition-colors ${active
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-input bg-muted/30">
      <button type="button" title="Bold (Ctrl+B)"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        className={btnClass(editorState.bold)}>
        <Bold size={14} />
      </button>
      <button type="button" title="Italic (Ctrl+I)"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        className={btnClass(editorState.italic)}>
        <Italic size={14} />
      </button>
      <button type="button" title="Underline (Ctrl+U)"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
        className={btnClass(editorState.underline)}>
        <UnderlineIcon size={14} />
      </button>

      <Divider />

      <SizeSelector onSelect={(s) => editor.chain().focus().setFontSize(s).run()} />
      <ColorPicker onSelect={onColorSelect} current={currentColor} />

      <Divider />

      <button type="button" title="Bullet list"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
        className={btnClass(editorState.bulletList)}>
        <List size={14} />
      </button>
      <button type="button" title="Numbered list"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
        className={btnClass(editorState.orderedList)}>
        <ListOrdered size={14} />
      </button>
    </div>
  );
}

// ─── Main RichTextEditor ──────────────────────────────────────────────────────
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  minHeight?: number;
}

export function RichTextEditor({
  value, onChange, placeholder = 'Write here...', disabled = false,
  maxLength, minHeight = 160,
}: RichTextEditorProps) {
  const [currentColor, setCurrentColor] = useState('#000000');

  // ✅ FIX: Track apakah editor punya konten (termasuk saat list aktif tapi belum ada teks)
  const [hasContent, setHasContent] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ['paragraph'] }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate({ editor }) {
      const html   = editor.getHTML();
      const text   = editor.getText();
      const isInList = editor.isActive('bulletList') || editor.isActive('orderedList');

      // ✅ Placeholder hilang saat: ada teks ATAU sedang di dalam list node
      setHasContent(text.trim().length > 0 || isInList);

      if (maxLength && text.length > maxLength) return;
      onChange(html);
    },
    onSelectionUpdate({ editor }) {
      const text     = editor.getText();
      const isInList = editor.isActive('bulletList') || editor.isActive('orderedList');
      setHasContent(text.trim().length > 0 || isInList);
    },
    editorProps: {
      attributes: {
        class: 'outline-none',
      },
    },
  }, [disabled]);

  // Sync value dari luar
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '');
      // Update hasContent setelah set
      const text     = editor.getText();
      const isInList = editor.isActive('bulletList') || editor.isActive('orderedList');
      setHasContent(text.trim().length > 0 || isInList);
    }
  }, [value, editor]);

  // Set hasContent saat pertama load
  useEffect(() => {
    if (!editor) return;
    const text = editor.getText();
    setHasContent(text.trim().length > 0);
  }, [editor]);

  const handleColorSelect = (color: string) => {
    setCurrentColor(color);
    editor?.chain().focus().setColor(color).run();
  };

  if (!editor) return null;

  return (
    <div className={`rounded-md border border-input bg-background overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {!disabled && (
        <Toolbar
          editor={editor}
          onColorSelect={handleColorSelect}
          currentColor={currentColor}
        />
      )}

      <div className="relative" style={{ minHeight: `${minHeight}px` }}>
        <style>{`
          .rte-content { outline: none; padding: 12px; min-height: ${minHeight}px; font-size: 14px; line-height: 1.6; color: inherit; }
          .rte-content p { margin: 0.25rem 0; }
          .rte-content p:first-child { margin-top: 0; }
          .rte-content strong { font-weight: 700; }
          .rte-content em { font-style: italic; }
          .rte-content u { text-decoration: underline; }
          .rte-content ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; }
          .rte-content ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; }
          .rte-content li { margin: 0.2rem 0 !important; display: list-item !important; }
          .rte-content li p { margin: 0 !important; }
        `}</style>

        <EditorContent editor={editor} className="rte-content" />

        {/* ✅ FIX: Sembunyikan placeholder kalau ada konten ATAU sedang di list */}
        {!hasContent && (
          <p className="absolute top-3 left-3 text-sm text-muted-foreground pointer-events-none select-none">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Helper: strip HTML untuk char count ─────────────────────────────────────
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}