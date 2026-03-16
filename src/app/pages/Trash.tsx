// src/app/pages/Trash.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrash, TrashItem } from '../context/TrashContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Trash2, RotateCcw, Loader2, AlertTriangle, Receipt,
  CheckSquare, StickyNote, Tag, Wallet, Info, Eye, ChevronLeft,
} from 'lucide-react';

/* ─────────────────────────── types & constants ── */
type TableFilter = 'all' | 'transactions' | 'tasks' | 'notes' | 'categories' | 'accounts';

const TABLE_LABELS: Record<string, string> = {
  transactions: 'Transaction',
  tasks:        'Task',
  notes:        'Note',
  categories:   'Category',
  accounts:     'Account',
};

const TABLE_ICONS: Record<string, React.ReactNode> = {
  transactions: <Receipt size={13} />,
  tasks:        <CheckSquare size={13} />,
  notes:        <StickyNote size={13} />,
  categories:   <Tag size={13} />,
  accounts:     <Wallet size={13} />,
};

const TABLE_COLORS: Record<string, string> = {
  transactions: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  tasks:        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  notes:        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  categories:   'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  accounts:     'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
};

const TAB_FILTERS: TableFilter[] = ['all', 'transactions', 'tasks', 'notes', 'categories', 'accounts'];

/* ─────────────────────────── helpers ── */
function daysUntilExpiry(deletedAt: string) {
  const expiry = new Date(new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function fmt(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

/* ─────────────────────────── detail panel ── */
function TrashItemDetail({ item }: { item: TrashItem }) {
  const days = daysUntilExpiry(item.deleted_at);
  const deletedDate = new Date(item.deleted_at).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const expiryDate = new Date(new Date(item.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 mt-1">
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${TABLE_COLORS[item.table]}`}>
        {TABLE_ICONS[item.table]}
        {TABLE_LABELS[item.table]}
      </span>

      <div className="space-y-3 divide-y divide-border">
        {item.table === 'transactions' && (
          <div className="space-y-3">
            <DetailRow label="Amount" value={
              <span className={item.meta?.type === 'income' ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                {item.meta?.type === 'income' ? '+' : '-'}{fmt(item.meta?.amount ?? 0)}
              </span>
            } />
            <DetailRow label="Type"  value={<span className="capitalize">{item.meta?.type}</span>} />
            <DetailRow label="Date"  value={new Date(item.meta?.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} />
            {item.description && <DetailRow label="Description" value={item.description} />}
          </div>
        )}
        {item.table === 'tasks' && (
          <div className="space-y-3">
            <DetailRow label="Title"    value={item.name} />
            {item.description && <DetailRow label="Deadline" value={item.description.replace('Deadline: ', '')} />}
          </div>
        )}
        {item.table === 'notes' && (
          <div className="space-y-3">
            <DetailRow label="Title"           value={item.name} />
            {item.description && <DetailRow label="Content preview" value={item.description} />}
          </div>
        )}
        {item.table === 'categories' && (
          <div className="space-y-3">
            <DetailRow label="Name" value={item.name} />
            <DetailRow label="Type" value={<span className="capitalize">{item.meta?.type}</span>} />
            {item.meta?.color && (
              <DetailRow label="Color" value={
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: item.meta.color }} />
                  <span>{item.meta.color}</span>
                </div>
              } />
            )}
          </div>
        )}
        {item.table === 'accounts' && (
          <div className="space-y-3">
            <DetailRow label="Name"    value={item.name} />
            <DetailRow label="Type"    value={item.meta?.type} />
            <DetailRow label="Balance" value={<span className="font-semibold">{fmt(item.meta?.balance ?? 0)}</span>} />
          </div>
        )}

        {/* Meta — deleted / expiry */}
        <div className="space-y-3 pt-3">
          <DetailRow label="Deleted on"    value={deletedDate} />
          <DetailRow label="Auto-delete on" value={expiryDate} />
          <DetailRow label="Time remaining" value={
            <span className={`font-medium flex items-center gap-1 ${
              days <= 3 ? 'text-red-600 dark:text-red-400' :
              days <= 7 ? 'text-amber-600 dark:text-amber-400' :
              'text-foreground'
            }`}>
              {days <= 3 && <AlertTriangle size={12} />}
              {days === 0 ? 'Expires today' : `${days} day${days !== 1 ? 's' : ''} left`}
            </span>
          } />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── main component ── */
export function Trash() {
  const { trashItems, loading, error, restoreItem, hardDeleteItem, hardDeleteAll } = useTrash();
  const navigate = useNavigate();
  const [activeTab, setActiveTab]     = useState<TableFilter>('all');
  const [sortBy, setSortBy]           = useState<'expiry' | 'deleted'>('expiry');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [restoringAll, setRestoringAll] = useState(false);
  const [clearingAll, setClearingAll]   = useState(false);
  const [detailItem, setDetailItem]     = useState<TrashItem | null>(null);

  const filtered = (activeTab === 'all'
    ? trashItems
    : trashItems.filter(i => i.table === activeTab)
  ).slice().sort((a, b) => {
    if (sortBy === 'expiry') return daysUntilExpiry(a.deleted_at) - daysUntilExpiry(b.deleted_at);
    return new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime();
  });

  const countOf = (t: TableFilter) =>
    t === 'all' ? trashItems.length : trashItems.filter(i => i.table === t).length;

  const handleRestore = async (item: TrashItem) => {
    setProcessingId(item.id + '_restore');
    const { success, error } = await restoreItem(item);
    if (!success) alert(error || 'Failed to restore');
    setProcessingId(null);
  };

  const handleRestoreAll = async () => {
    if (!confirm(`Restore all ${filtered.length} items?`)) return;
    setRestoringAll(true);
    for (const item of filtered) {
      await restoreItem(item);
    }
    setRestoringAll(false);
  };

  const handleHardDelete = async (item: TrashItem) => {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    setProcessingId(item.id + '_delete');
    const { success, error } = await hardDeleteItem(item);
    if (!success) alert(error || 'Failed to delete');
    setProcessingId(null);
  };

  const handleClearAll = async () => {
    if (!confirm(`Permanently delete ALL ${trashItems.length} items? This cannot be undone.`)) return;
    setClearingAll(true);
    const { success, error } = await hardDeleteAll();
    if (!success) alert(error || 'Failed to clear trash');
    setClearingAll(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
      <p className="text-red-600 dark:text-red-400">Error: {error}</p>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={16} />
              Back to Settings
            </button>
            {trashItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleRestoreAll}
                  disabled={restoringAll || clearingAll}
                >
                  {restoringAll
                    ? <><Loader2 size={14} className="animate-spin" /> Restoring...</>
                    : <><RotateCcw size={14} /> Restore All</>
                  }
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={handleClearAll}
                  disabled={clearingAll || restoringAll}
                >
                  {clearingAll
                    ? <><Loader2 size={14} className="animate-spin" /> Clearing...</>
                    : <><Trash2 size={14} /> Empty Trash</>
                  }
                </Button>
              </div>
            )}
          </div>

          {/* ── Info banner ── */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
            <Info size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Items in trash are automatically deleted after <strong>30 days</strong>. Restore them before they expire.
            </p>
          </div>

          {/* ── Filter + Sort row ── */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Type filter pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {TAB_FILTERS.map(t => {
                const count  = countOf(t);
                const active = activeTab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTab(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-white dark:bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {t !== 'all' && TABLE_ICONS[t]}
                    {t === 'all' ? 'All' : `${TABLE_LABELS[t]}s`}
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sort toggle */}
            <div className="flex items-center gap-1 bg-white dark:bg-card border border-border rounded-lg p-1 shadow-sm flex-shrink-0">
              {([
                { key: 'expiry',  label: 'Expiry'  },
                { key: 'deleted', label: 'Deleted' },
              ] as { key: 'expiry' | 'deleted'; label: string }[]).map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSortBy(s.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    sortBy === s.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Items list ── */}
          <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Trash2 size={36} className="text-muted-foreground/25 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Trash is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Deleted items will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map(item => {
                    const days         = daysUntilExpiry(item.deleted_at);
                    const isRestoring  = processingId === item.id + '_restore';
                    const isDeleting   = processingId === item.id + '_delete';
                    const isProcessing = isRestoring || isDeleting;
                    const deletedLabel = new Date(item.deleted_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    });

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        {/* Clickable left area */}
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => setDetailItem(item)}
                        >
                          {/* Type badge */}
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${TABLE_COLORS[item.table]}`}>
                            {TABLE_ICONS[item.table]}
                            <span className="hidden sm:inline">{TABLE_LABELS[item.table]}</span>
                          </span>

                          {/* Name + deleted date */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate leading-tight">{item.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Deleted {deletedLabel}
                              {item.description && <span className="ml-2 text-muted-foreground/60">· {item.description}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Days remaining */}
                        <span className={`text-xs font-semibold flex-shrink-0 flex items-center gap-1 ${
                          days <= 3 ? 'text-red-600 dark:text-red-400' :
                          days <= 7 ? 'text-amber-600 dark:text-amber-400' :
                          'text-muted-foreground'
                        }`}>
                          {days <= 3 && <AlertTriangle size={11} />}
                          {days === 0 ? 'Today' : `${days}d`}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="View detail"
                            onClick={() => setDetailItem(item)}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Restore"
                            onClick={() => handleRestore(item)}
                            disabled={isProcessing || restoringAll}
                          >
                            {isRestoring
                              ? <Loader2 size={14} className="animate-spin" />
                              : <RotateCcw size={14} />
                            }
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-red-500 hover:text-white"
                            title="Delete permanently"
                            onClick={() => handleHardDelete(item)}
                            disabled={isProcessing || restoringAll}
                          >
                            {isDeleting
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />
                            }
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Detail Modal ── */}
      <Dialog open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="bg-card border border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base font-semibold">Item Detail</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <>
              <TrashItemDetail item={detailItem} />
              <div className="flex gap-2 pt-3 border-t border-border mt-1">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => { setDetailItem(null); handleRestore(detailItem); }}
                  disabled={!!processingId}
                >
                  <RotateCcw size={14} /> Restore
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() => { setDetailItem(null); handleHardDelete(detailItem); }}
                  disabled={!!processingId}
                >
                  <Trash2 size={14} /> Delete Permanently
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}