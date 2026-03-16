// src/app/pages/Categories.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';
import { useTransactions } from '../context/TransactionContext';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NoteContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Plus, Edit, Trash2, Search, Loader2, Save,
  ChevronRight, ChevronLeft, FolderOpen, Tag, AlertTriangle,
} from 'lucide-react';
import { Category } from '../types';

type DialogMode = 'add-parent' | 'add-sub' | 'edit';
type TabType    = 'transaction' | 'task' | 'note';

/* ── Preset colors ── */
const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#6b7280',
];

export function Categories() {
  const navigate = useNavigate();
  const {
    loading, error,
    getCategoriesByType, getSubcategories, hasSubcategories,
    createCategory, updateCategory, deleteCategory,
  } = useCategories();
  const { transactions } = useTransactions();
  const { tasks }        = useTasks();
  const { notes }        = useNotes();

  const [searchQuery, setSearchQuery]   = useState('');
  const [activeTab, setActiveTab]       = useState<TabType>('transaction');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode]     = useState<DialogMode>('add-parent');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedParent, setSelectedParent]   = useState<Category | null>(null);
  const [expandedIds, setExpandedIds]         = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '', type: 'transaction' as TabType,
    subtype: '' as 'income' | 'expense' | '', color: '#3b82f6',
  });
  const [submitting, setSubmitting]       = useState(false);
  const [subtypeFilter, setSubtypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [hexInput, setHexInput]           = useState('3B82F6'); // display state for hex input

  /* ── Usage count map ── */
  const usageMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => { map[t.categoryId] = (map[t.categoryId] || 0) + 1; });
    tasks.forEach(t       => { map[t.categoryId] = (map[t.categoryId] || 0) + 1; });
    notes.forEach(n       => { map[n.categoryId] = (map[n.categoryId] || 0) + 1; });
    return map;
  }, [transactions, tasks, notes]);

  const getCategoryUsage = (id: string) => {
    const subs = getSubcategories(id);
    return (usageMap[id] || 0) + subs.reduce((s, sub) => s + (usageMap[sub.id] || 0), 0);
  };

  /* ── Dialog handlers ── */
  const openAddParent = (type: TabType) => {
    setDialogMode('add-parent'); setEditingCategory(null); setSelectedParent(null);
    setFormData({ name: '', type, subtype: '', color: '#3b82f6' });
    setHexInput('3B82F6');
    setIsDialogOpen(true);
  };

  const openAddSub = (parent: Category) => {
    setDialogMode('add-sub'); setEditingCategory(null); setSelectedParent(parent);
    setFormData({ name: '', type: parent.type, subtype: parent.subtype ?? '', color: parent.color || '#3b82f6' });
    setHexInput((parent.color || '#3b82f6').replace(/^#/, '').toUpperCase());
    setIsDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setDialogMode('edit'); setEditingCategory(category); setSelectedParent(null);
    setFormData({ name: category.name, type: category.type, subtype: category.subtype ?? '', color: category.color || '#3b82f6' });
    setHexInput((category.color || '#3b82f6').replace(/^#/, '').toUpperCase());
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (dialogMode === 'edit' && editingCategory) {
        const updates: Partial<Category> = { name: formData.name, color: formData.color };
        if (editingCategory.type === 'transaction' && !editingCategory.parentId)
          updates.subtype = formData.subtype || undefined;
        const { success, error } = await updateCategory(editingCategory.id, updates);
        if (success) setIsDialogOpen(false); else alert(error || 'Failed to update');

      } else if (dialogMode === 'add-sub' && selectedParent) {
        const { success, error } = await createCategory({
          name: formData.name, type: selectedParent.type, color: formData.color,
          parentId: selectedParent.id, subtype: selectedParent.subtype,
        });
        if (success) { setIsDialogOpen(false); setExpandedIds(prev => new Set([...prev, selectedParent.id])); }
        else alert(error || 'Failed to create subcategory');

      } else {
        const { success, error } = await createCategory({
          name: formData.name, type: formData.type, color: formData.color, parentId: null,
          subtype: formData.type === 'transaction' && formData.subtype ? formData.subtype : undefined,
        });
        if (success) setIsDialogOpen(false); else alert(error || 'Failed to create category');
      }
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (category: Category) => {
    const hasSubs  = hasSubcategories(category.id);
    const usage    = getCategoryUsage(category.id);
    const subCount = getSubcategories(category.id).length;
    let msg = `Delete "${category.name}"?`;
    const warnings: string[] = [];
    if (hasSubs)    warnings.push(`${subCount} subcategor${subCount > 1 ? 'ies' : 'y'} will also be deleted`);
    if (usage > 0)  warnings.push(`${usage} item${usage > 1 ? 's' : ''} using this category will lose their category`);
    if (warnings.length > 0) msg += `\n\n⚠️ Warning:\n• ${warnings.join('\n• ')}`;
    if (!confirm(msg)) return;
    const { success, error } = await deleteCategory(category.id);
    if (!success) alert(error || 'Failed to delete category');
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const matchesSearch = (cat: Category) =>
    !searchQuery || cat.name.toLowerCase().includes(searchQuery.toLowerCase());

  const countWithSubs = (type: TabType) => {
    const parents = getCategoriesByType(type);
    return parents.length + parents.reduce((s, p) => s + getSubcategories(p.id).length, 0);
  };

  const showSubtypeSelector =
    (dialogMode === 'add-parent' && formData.type === 'transaction') ||
    (dialogMode === 'edit' && editingCategory?.type === 'transaction' && !editingCategory?.parentId);

  const dialogTitle = dialogMode === 'edit' ? 'Edit Category'
    : dialogMode === 'add-sub' ? `Add Subcategory to "${selectedParent?.name}"`
    : 'Add New Category';

  /* ── Category row ── */
  const CategoryRow = ({ category, isSubcat = false }: { category: Category; isSubcat?: boolean }) => {
    const subs        = getSubcategories(category.id);
    const isExpanded  = expandedIds.has(category.id);
    const visibleSubs = subs.filter(matchesSearch);
    const usage       = getCategoryUsage(category.id);
    if (searchQuery && !matchesSearch(category) && visibleSubs.length === 0) return null;

    return (
      <div>
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border border-border transition-colors hover:bg-muted/40 ${
          isSubcat ? 'bg-muted/20 ml-6' : 'bg-muted/30'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {!isSubcat && subs.length > 0 ? (
              <button onClick={() => toggleExpand(category.id)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <ChevronRight size={15} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            ) : <div className="w-4 flex-shrink-0" />}
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isSubcat ? <Tag size={12} className="text-muted-foreground flex-shrink-0" />
                : subs.length > 0 ? <FolderOpen size={12} className="text-muted-foreground flex-shrink-0" /> : null}
              <span className="text-sm font-medium text-foreground truncate">{category.name}</span>
              {subs.length > 0 && !isSubcat && <span className="text-xs text-muted-foreground flex-shrink-0">({subs.length})</span>}
              {!isSubcat && category.type === 'transaction' && category.subtype && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  category.subtype === 'income'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>{category.subtype === 'income' ? 'Income' : 'Expense'}</span>
              )}
            </div>
          </div>

          {/* Usage count badge */}
          <div className="flex-shrink-0 mr-2">
            {usage > 0
              ? <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{usage} item{usage !== 1 ? 's' : ''}</span>
              : <span className="text-xs text-muted-foreground/40">unused</span>
            }
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0 flex-shrink-0">
            {!isSubcat && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                title="Add subcategory" onClick={() => openAddSub(category)}>
                <Plus size={13} />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => openEdit(category)}><Edit size={13} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-red-500 hover:text-white"
              onClick={() => handleDelete(category)}><Trash2 size={13} /></Button>
          </div>
        </div>
        {(isExpanded || searchQuery) && visibleSubs.length > 0 && (
          <div className="mt-1 space-y-1">{visibleSubs.map(sub => <CategoryRow key={sub.id} category={sub} isSubcat />)}</div>
        )}
      </div>
    );
  };

  /* ── Category list ── */
  const CategoryList = ({ type }: { type: TabType }) => {
    if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
    const parents = getCategoriesByType(type);
    const visible = parents.filter(p => {
      if (type === 'transaction' && subtypeFilter !== 'all' && p.subtype !== subtypeFilter) return false;
      if (!searchQuery) return true;
      return matchesSearch(p) || getSubcategories(p.id).some(matchesSearch);
    });
    return (
      <div className="space-y-1.5 no-scrollbar">
        {visible.length === 0
          ? <p className="text-center text-muted-foreground py-10 text-sm">{searchQuery ? 'No categories found' : 'No categories yet'}</p>
          : visible.map(cat => <CategoryRow key={cat.id} category={cat} />)
        }
      </div>
    );
  };

  if (error) return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p className="text-red-600 dark:text-red-400">Error: {error}</p>
    </div>
  );

  const TABS: { key: TabType; label: string }[] = [
    { key: 'transaction', label: 'Transactions' },
    { key: 'task',        label: 'Tasks'        },
    { key: 'note',        label: 'Notes'        },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => navigate('/settings')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} /> Back to Settings
            </button>
            <Button size="sm" className="gap-2" onClick={() => openAddParent(activeTab)}>
              <Plus size={15} /> Add Category
            </Button>
          </div>

          {/* ── Search ── */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input placeholder="Search categories..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 border border-border shadow-sm" />
          </div>

          {/* ── Tab pills ── */}
          <div className="flex gap-1.5">
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-white dark:bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}>
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {countWithSubs(tab.key)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Subtype filter ── */}
          {activeTab === 'transaction' && (
            <div className="flex gap-1.5">
              {([{ value: 'all', label: 'All' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }] as const).map(opt => (
                <button key={opt.value} type="button" onClick={() => setSubtypeFilter(opt.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    subtypeFilter === opt.value
                      ? opt.value === 'income' ? 'bg-green-600 text-white border-green-600'
                        : opt.value === 'expense' ? 'bg-red-600 text-white border-red-600'
                        : 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white dark:bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                  }`}>{opt.label}</button>
              ))}
            </div>
          )}

          {/* ── List card ── */}
          <Card className="bg-white dark:bg-card border-2 border-blue-200 dark:border-blue-900/50 shadow-sm rounded-xl">
            <CardContent className="p-3"><CategoryList type={activeTab} /></CardContent>
          </Card>

        </div>
      </div>

      {/* ── Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base font-semibold">{dialogTitle}</DialogTitle>
            {dialogMode === 'add-sub' && selectedParent && (
              <p className="text-xs text-muted-foreground mt-1">Under <span className="font-medium text-foreground">{selectedParent.name}</span></p>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-1">

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">{dialogMode === 'add-sub' ? 'Subcategory Name' : 'Category Name'}</Label>
              <Input id="name" placeholder={dialogMode === 'add-sub' ? 'e.g. Restaurant, Coffee' : 'e.g. Food, Transport'}
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>

            {/* Type */}
            {dialogMode === 'add-parent' && (
              <div className="space-y-1.5">
                <Label>Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['transaction', 'task', 'note'] as const).map(t => (
                    <Button key={t} type="button" variant={formData.type === t ? 'default' : 'outline'} size="sm"
                      onClick={() => setFormData({ ...formData, type: t, subtype: '' })}>
                      {t === 'transaction' ? 'Transaction' : t === 'task' ? 'Task' : 'Note'}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtype */}
            {showSubtypeSelector && (
              <div className="space-y-1.5">
                <Label>Subtype</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }] as const).map(opt => (
                    <Button key={opt.value} type="button" variant={formData.subtype === opt.value ? 'default' : 'outline'} size="sm"
                      onClick={() => setFormData({ ...formData, subtype: opt.value })}
                      className={formData.subtype === opt.value && opt.value === 'income' ? 'bg-green-600 hover:bg-green-700 border-green-600'
                        : formData.subtype === opt.value && opt.value === 'expense' ? 'bg-red-600 hover:bg-red-700 border-red-600' : ''}>
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.subtype === 'income' ? 'Only appears when adding income transactions.'
                    : formData.subtype === 'expense' ? 'Only appears when adding expense transactions.'
                    : 'Please select income or expense.'}
                </p>
              </div>
            )}

            {/* Parent badge */}
            {dialogMode === 'add-sub' && selectedParent && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedParent.color }} />
                <span className="text-xs text-muted-foreground">Under:</span>
                <span className="text-xs font-medium text-foreground">{selectedParent.name}</span>
                {selectedParent.subtype && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    selectedParent.subtype === 'income'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>{selectedParent.subtype}</span>
                )}
              </div>
            )}

            {/* Color — preset swatches + custom input */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-8 gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => {
                    setFormData({ ...formData, color: c });
                    setHexInput(c.replace(/^#/, '').toUpperCase());
                  }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.color.toLowerCase() === c.toLowerCase() ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input type="color" value={formData.color}
                  onChange={(e) => {
                    setFormData({ ...formData, color: e.target.value });
                    setHexInput(e.target.value.replace(/^#/, '').toUpperCase());
                  }}
                  className="w-9 h-9 rounded-md border border-border cursor-pointer bg-transparent p-0.5 flex-shrink-0" />
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono select-none pointer-events-none">#</span>
                  <Input
                    value={hexInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
                      setHexInput(raw);
                      setFormData({ ...formData, color: `#${raw.padEnd(6, '0')}` });
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="3B82F6"
                    maxLength={6}
                    className="pl-7 font-mono text-sm uppercase"
                  />
                </div>
                <div className="w-8 h-8 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: formData.color }} />
              </div>
            </div>

            {/* Usage warning in edit mode */}
            {dialogMode === 'edit' && editingCategory && (() => {
              const usage = getCategoryUsage(editingCategory.id);
              if (usage === 0) return null;
              return (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Used by <strong>{usage} item{usage !== 1 ? 's' : ''}</strong>. Changes apply to all of them.
                  </p>
                </div>
              );
            })()}

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Save size={14} /> {dialogMode === 'edit' ? 'Update' : 'Save'}</>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}