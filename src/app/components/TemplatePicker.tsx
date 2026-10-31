// src/app/components/TemplatePicker.tsx
import { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import type { TransactionTemplate } from '../hooks/useTransactionTemplates';
import { fmtIDR } from '../../lib/formatCurrency';

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TransactionTemplate[];
  onSelect: (template: TransactionTemplate) => void;
  onDelete: (template: TransactionTemplate) => void;
}

export function TemplatePicker({ open, onOpenChange, templates, onSelect, onDelete }: TemplatePickerProps) {
  const [query, setQuery] = useState('');
  const matches = templates.filter(t => t.name.toLowerCase().includes(query.trim().toLowerCase()));

  const close = () => { onOpenChange(false); setQuery(''); };

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) close(); }}>
      <DialogContent
        // minmax(0, 1fr): an auto column would grow with a long name instead of truncating it.
        className="top-[12vh] translate-y-0 grid-cols-[minmax(0,1fr)] gap-0 p-0 overflow-hidden sm:max-w-xl"
        // A phone keyboard would cover the list, and it is short enough to scan.
        onOpenAutoFocus={e => { if (window.matchMedia('(pointer: coarse)').matches) e.preventDefault(); }}
      >
        <DialogTitle className="sr-only">Templates</DialogTitle>
        <DialogDescription className="sr-only">Choose a template to fill in the form.</DialogDescription>
        <div className="flex items-center gap-3 px-5 py-4 pr-11">
          <Search size={20} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search templates..."
            aria-label="Search templates"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && matches[0]) { e.preventDefault(); onSelect(matches[0]); close(); }
            }}
            className="flex-1 min-w-0 bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="border-t border-border">
          {matches.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No templates found</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto overscroll-contain p-2">
              {matches.map(tpl => (
                <li key={tpl.id} className="flex items-center rounded-lg hover:bg-muted transition-colors">
                  <button type="button" onClick={() => { onSelect(tpl); close(); }}
                    className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2.5 text-left">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tpl.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="flex-1 truncate text-sm font-medium">{tpl.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{fmtIDR(tpl.amount)}</span>
                  </button>
                  <button type="button" onClick={() => { onDelete(tpl); close(); }}
                    aria-label="Delete template"
                    className="flex items-center justify-center w-11 h-11 flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
