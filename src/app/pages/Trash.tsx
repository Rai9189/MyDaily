import { useState } from 'react';
import { useTrash, TrashItem } from '../context/TrashContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Trash2, RotateCcw, Loader2, AlertTriangle, Receipt,
  CheckSquare, StickyNote, Tag, Wallet, Info, Eye
} from 'lucide-react';

type TableFilter = 'all' | 'transactions' | 'tasks' | 'notes' | 'categories' | 'accounts';

const TABLE_LABELS: Record<string, string> = {
  transactions: 'Transaction',
  tasks: 'Task',
  notes: 'Note',
  categories: 'Category',
  accounts: 'Account',
};

const TABLE_ICONS: Record<string, React.ReactNode> = {
  transactions: <Receipt size={15} />,
  tasks: <CheckSquare size={15} />,
  notes: <StickyNote size={15} />,
  categories: <Tag size={15} />,
  accounts: <Wallet size={15} />,
};

const TABLE_COLORS: Record<string, string> = {
  transactions: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  tasks: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  notes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  categories: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  accounts: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function daysUntilExpiry(deletedAt: string) {
  const deleted = new Date(deletedAt);
  const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatCurrency(amount: number) {
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

function TrashItemDetail({ item }: { item: TrashItem }) {
  const days = daysUntilExpiry(item.deleted_at);
  const deletedDate = new Date(item.deleted_at).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const expiryDate = new Date(new Date(item.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${TABLE_COLORS[item.table]}`}>
          {TABLE_ICONS[item.table]}
          {TABLE_LABELS[item.table]}
        </span>
      </div>

      <div className="space-y-3 divide-y divide-border">
        {item.table === 'transactions' && (
          <div className="space-y-3">
            <DetailRow label="Amount" value={
              <span className={item.meta?.type === 'income' ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                {item.meta?.type === 'income' ? '+' : '-'}{formatCurrency(item.meta?.amount ?? 0)}
              </span>
            } />
            <DetailRow label="Type" value={<span className="capitalize">{item.meta?.type}</span>} />
            <DetailRow label="Date" value={
              new Date(item.meta?.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
            } />
            {item.description && <DetailRow label="Description" value={item.description} />}
          </div>
        )}
        {item.table === 'tasks' && (
          <div className="space-y-3">
            <DetailRow label="Title" value={item.name} />
            {item.description && <DetailRow label="Deadline" value={item.description.replace('Deadline: ', '')} />}
          </div>
        )}
        {item.table === 'notes' && (
          <div className="space-y-3">
            <DetailRow label="Title" value={item.name} />
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
            <DetailRow label="Name" value={item.name} />
            <DetailRow label="Type" value={item.meta?.type} />
            <DetailRow label="Balance" value={<span className="font-semibold">{formatCurrency(item.meta?.balance ?? 0)}</span>} />
          </div>
        )}
        <div className="space-y-3 pt-3">
          <DetailRow label="Deleted on" value={deletedDate} />
          <DetailRow label="Auto-delete on" value={expiryDate} />
          <DetailRow label="Time remaining" value={
            <span className={`font-medium flex items-center gap-1 ${
              days <= 3 ? 'text-red-600 dark:text-red-400' :
              days <= 7 ? 'text-amber-600 dark:text-amber-400' :
              'text-foreground'
            }`}>
              {days <= 3 && <AlertTriangle size={13} />}
              {days === 0 ? 'Expires today' : `${days} day${days !== 1 ? 's' : ''} left`}
            </span>
          } />
        </div>
      </div>
    </div>
  );
}

export function Trash() {
  const { trashItems, loading, error, restoreItem, hardDeleteItem, hardDeleteAll } = useTrash();
  const [activeTab, setActiveTab] = useState<TableFilter>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [detailItem, setDetailItem] = useState<TrashItem | null>(null);

  const filtered = activeTab === 'all'
    ? trashItems
    : trashItems.filter(i => i.table === activeTab);

  const countOf = (t: TableFilter) => t === 'all'
    ? trashItems.length
    : trashItems.filter(i => i.table === t).length;

  const handleRestore = async (item: TrashItem) => {
    setProcessingId(item.id + '_restore');
    const { success, error } = await restoreItem(item);
    if (!success) alert(error || 'Failed to restore');
    setProcessingId(null);
  };

  const handleHardDelete = async (item: TrashItem) => {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    setProcessingId(item.id + '_delete');
    const { success, error } = await hardDeleteItem(item);
    if (!success) alert(error || 'Failed to delete');
    setProcessingId(null);
  };

  const handleClearAll = async () => {
    if (!confirm(`Permanently delete ALL ${trashItems.length} items in trash? This cannot be undone.`)) return;
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
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Trash</h1>
          <p className="text-muted-foreground mt-1">Items are permanently deleted after 30 days</p>
        </div>
        {trashItems.length > 0 && (
          <Button variant="destructive" className="gap-2" onClick={handleClearAll} disabled={clearingAll}>
            {clearingAll
              ? <><Loader2 size={16} className="animate-spin" /> Clearing...</>
              : <><Trash2 size={16} /> Empty Trash</>
            }
          </Button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <Info size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Items in trash are automatically permanently deleted after <strong>30 days</strong>. Restore them before they expire.
        </p>
      </div>

      {/* Tabs */}
      <Card className="border border-border bg-card">
        <CardContent className="pt-4">
          <Tabs defaultValue="all" onValueChange={(v) => setActiveTab(v as TableFilter)}>

            {/* TabsList — scroll horizontal di mobile */}
            <div className="overflow-x-auto no-scrollbar">
              <TabsList className="flex w-max min-w-full md:grid md:grid-cols-6 gap-1">
                {(['all', 'transactions', 'tasks', 'notes', 'categories', 'accounts'] as TableFilter[]).map(t => (
                  <TabsTrigger
                    key={t}
                    value={t}
                    className="whitespace-nowrap text-xs px-3"
                  >
                    <span className="flex items-center gap-1">
                      {t !== 'all' && TABLE_ICONS[t]}
                      {t === 'all'
                        ? `All (${countOf('all')})`
                        : `${TABLE_LABELS[t]}s (${countOf(t)})`
                      }
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {(['all', 'transactions', 'tasks', 'notes', 'categories', 'accounts'] as TableFilter[]).map(t => (
              <TabsContent key={t} value={t} className="mt-4">
                {filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <Trash2 size={40} className="text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Trash is empty</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Deleted items will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(item => {
                      const days = daysUntilExpiry(item.deleted_at);
                      const isRestoring = processingId === item.id + '_restore';
                      const isDeleting = processingId === item.id + '_delete';
                      const isProcessing = isRestoring || isDeleting;

                      return (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-4 px-4 py-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div
                            className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                            onClick={() => setDetailItem(item)}
                          >
                            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${TABLE_COLORS[item.table]}`}>
                              {TABLE_ICONS[item.table]}
                              <span className="hidden sm:inline">{TABLE_LABELS[item.table]}</span>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-xs text-muted-foreground/60">
                                  Deleted {new Date(item.deleted_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span className={`text-xs font-medium flex items-center gap-1 ${
                                  days <= 3 ? 'text-red-600 dark:text-red-400' :
                                  days <= 7 ? 'text-amber-600 dark:text-amber-400' :
                                  'text-muted-foreground'
                                }`}>
                                  {days <= 3 && <AlertTriangle size={11} />}
                                  {days === 0 ? 'Expires today' : `${days}d left`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="View detail"
                              onClick={() => setDetailItem(item)}
                            >
                              <Eye size={15} />
                            </Button>
                            <Button
                              variant="outline" size="icon"
                              className="h-8 w-8"
                              title="Restore"
                              onClick={() => handleRestore(item)}
                              disabled={isProcessing}
                            >
                              {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-muted-foreground hover:bg-red-500 hover:text-white"
                              title="Delete permanently"
                              onClick={() => handleHardDelete(item)}
                              disabled={isProcessing}
                            >
                              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="bg-card border border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-semibold">Item Detail</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <>
              <TrashItemDetail item={detailItem} />
              <div className="flex gap-2 pt-2 border-t border-border mt-2">
                <Button
                  variant="outline" className="flex-1 gap-2"
                  onClick={() => { setDetailItem(null); handleRestore(detailItem); }}
                  disabled={!!processingId}
                >
                  <RotateCcw size={15} /> Restore
                </Button>
                <Button
                  variant="destructive" className="flex-1 gap-2"
                  onClick={() => { setDetailItem(null); handleHardDelete(detailItem); }}
                  disabled={!!processingId}
                >
                  <Trash2 size={15} /> Delete Permanently
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}