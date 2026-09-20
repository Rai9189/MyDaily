import { useState, useEffect, useMemo } from 'react';
import { Search, X, CreditCard, CheckSquare, FileText, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NoteContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { stripHtml } from '../../lib/stripHtml';

type SearchResult = {
  id: string;
  type: 'transaction' | 'task' | 'note' | 'account' | 'category';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  path: string;
};

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { transactions } = useTransactions();
  const { tasks } = useTasks();
  const { notes } = useNotes();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const allResults: SearchResult[] = [];

    // Search transactions
    transactions.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const acc = accounts.find(a => a.id === t.accountId);
      if (stripHtml(t.description || '').toLowerCase().includes(q) || cat?.name.toLowerCase().includes(q) || acc?.name.toLowerCase().includes(q)) {
        allResults.push({
          id: t.id,
          type: 'transaction',
          title: t.description || 'Unnamed Transaction',
          subtitle: `${t.type} · ${cat?.name || 'Other'} · ${acc?.name || 'Account'}`,
          icon: <CreditCard size={16} />,
          path: `/transactions/${t.id}`,
        });
      }
    });

    // Search tasks
    tasks.forEach(t => {
      if (t.title.toLowerCase().includes(q) || stripHtml(t.description || '').toLowerCase().includes(q)) {
        allResults.push({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: t.completed ? 'Completed' : `Status: ${t.status}`,
          icon: <CheckSquare size={16} />,
          path: `/tasks/${t.id}`,
        });
      }
    });

    // Search notes
    notes.forEach(n => {
      const plainContent = stripHtml(n.content || '');
      if (n.title.toLowerCase().includes(q) || plainContent.toLowerCase().includes(q)) {
        allResults.push({
          id: n.id,
          type: 'note',
          title: n.title || 'Untitled Note',
          subtitle: plainContent.substring(0, 60) || 'No content',
          icon: <FileText size={16} />,
          path: `/notes/${n.id}`,
        });
      }
    });

    // Search accounts
    accounts.forEach(a => {
      if (a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)) {
        allResults.push({
          id: a.id,
          type: 'account',
          title: a.name,
          subtitle: `${a.type} · Balance: Rp ${a.balance.toLocaleString('id-ID')}`,
          icon: <CreditCard size={16} />,
          path: `/accounts/${a.id}`,
        });
      }
    });

    // Search categories
    categories.forEach(c => {
      if (c.name.toLowerCase().includes(q)) {
        allResults.push({
          id: c.id,
          type: 'category',
          title: c.name,
          subtitle: `Type: ${c.type}`,
          icon: <Zap size={16} />,
          path: `/categories/${c.id}`,
        });
      }
    });

    return allResults;
  }, [query, transactions, tasks, notes, accounts, categories]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    onOpenChange(false);
    setQuery('');
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Cmd+K / Ctrl+K to toggle, arrow keys + Enter to navigate results, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
        setQuery('');
        setSelectedIndex(0);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === 'ArrowDown' && results.length > 0) {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % results.length);
      } else if (e.key === 'ArrowUp' && results.length > 0) {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange, results, selectedIndex]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Search Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
          <div className="w-full max-w-xl animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4">
                <Search size={20} className="text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  role="combobox"
                  aria-expanded={results.length > 0}
                  aria-controls="global-search-listbox"
                  aria-activedescendant={results.length > 0 ? `global-search-option-${selectedIndex}` : undefined}
                  aria-autocomplete="list"
                  placeholder="Search transactions, tasks, notes, accounts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="border-t border-border">
                {query.trim() ? (
                  results.length > 0 ? (
                    <div id="global-search-listbox" role="listbox" className="max-h-80 overflow-y-auto overscroll-contain p-2">
                      {results.map((result, idx) => (
                        <button
                          key={result.id}
                          id={`global-search-option-${idx}`}
                          role="option"
                          aria-selected={selectedIndex === idx}
                          type="button"
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            selectedIndex === idx ? 'bg-primary/10' : 'hover:bg-muted'
                          }`}
                        >
                          <div className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${
                            selectedIndex === idx ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {result.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {result.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          </div>
                          {selectedIndex === idx && (
                            <kbd className="hidden sm:block px-1.5 py-0.5 text-[10px] font-semibold text-primary bg-primary/10 rounded flex-shrink-0">↵</kbd>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Search size={28} className="text-muted-foreground/30" />
                      <p className="text-sm font-medium text-foreground">No results</p>
                      <p className="text-xs text-muted-foreground">Try a different keyword</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Zap size={22} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Start typing to search across all your data</p>
                  </div>
                )}
              </div>

              {/* Keyboard hints */}
              <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↑↓</kbd> Navigate</span>
                <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↵</kbd> Select</span>
                <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">esc</kbd> Close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
