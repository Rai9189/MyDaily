import { useState } from 'react';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Edit, Trash2, Search, Loader2, Save, ChevronRight, FolderOpen, Tag } from 'lucide-react';
import { Category } from '../types';

type DialogMode = 'add-parent' | 'add-sub' | 'edit';

export function Categories() {
  const {
    categories,
    loading,
    error,
    getCategoriesByType,
    getSubcategories,
    hasSubcategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'transaction' | 'task' | 'note'>('transaction');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('add-parent');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    type: 'transaction' as 'transaction' | 'task' | 'note',
    subtype: '' as 'income' | 'expense' | '',
    color: '#3b82f6',
  });
  const [submitting, setSubmitting] = useState(false);
  const [subtypeFilter, setSubtypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // ─── Dialog Handlers ───────────────────────────────────────

  const openAddParent = (type: 'transaction' | 'task' | 'note') => {
    setDialogMode('add-parent');
    setEditingCategory(null);
    setSelectedParent(null);
    setFormData({ name: '', type, subtype: '', color: '#3b82f6' });
    setIsDialogOpen(true);
  };

  const openAddSub = (parent: Category) => {
    setDialogMode('add-sub');
    setEditingCategory(null);
    setSelectedParent(parent);
    setFormData({ name: '', type: parent.type, subtype: parent.subtype ?? '', color: parent.color || '#3b82f6' });
    setIsDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setDialogMode('edit');
    setEditingCategory(category);
    setSelectedParent(null);
    setFormData({
      name: category.name,
      type: category.type,
      subtype: category.subtype ?? '',
      color: category.color || '#3b82f6',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (dialogMode === 'edit' && editingCategory) {
        const updates: Partial<Category> = {
          name: formData.name,
          color: formData.color,
        };
        // Only update subtype for transaction parent categories
        if (editingCategory.type === 'transaction' && !editingCategory.parentId) {
          updates.subtype = formData.subtype || undefined;
        }
        const { success, error } = await updateCategory(editingCategory.id, updates);
        if (success) setIsDialogOpen(false);
        else alert(error || 'Failed to update category');

      } else if (dialogMode === 'add-sub' && selectedParent) {
        const { success, error } = await createCategory({
          name: formData.name,
          type: selectedParent.type,
          color: formData.color,
          parentId: selectedParent.id,
          subtype: selectedParent.subtype,
        });
        if (success) {
          setIsDialogOpen(false);
          setExpandedIds(prev => new Set([...prev, selectedParent.id]));
        } else {
          alert(error || 'Failed to create subcategory');
        }

      } else {
        const { success, error } = await createCategory({
          name: formData.name,
          type: formData.type,
          color: formData.color,
          parentId: null,
          subtype: formData.type === 'transaction' && formData.subtype
            ? formData.subtype
            : undefined,
        });
        if (success) setIsDialogOpen(false);
        else alert(error || 'Failed to create category');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const hasSubs = hasSubcategories(category.id);
    const msg = hasSubs
      ? `Delete "${category.name}" and all its subcategories?`
      : `Delete "${category.name}"?`;
    if (!confirm(msg)) return;
    const { success, error } = await deleteCategory(category.id);
    if (!success) alert(error || 'Failed to delete category');
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Filter ─────────────────────────────────────────────────

  const matchesSearch = (cat: Category) =>
    !searchQuery || cat.name.toLowerCase().includes(searchQuery.toLowerCase());

  // ─── Category List UI ────────────────────────────────────────

  const CategoryRow = ({ category, isSubcat = false }: { category: Category; isSubcat?: boolean }) => {
    const subs = getSubcategories(category.id);
    const isExpanded = expandedIds.has(category.id);
    const visibleSubs = subs.filter(matchesSearch);

    if (searchQuery && !matchesSearch(category) && visibleSubs.length === 0) return null;

    return (
      <div>
        <div className={`flex items-center justify-between px-4 py-3 rounded-lg border border-border transition-colors hover:bg-muted/50 ${isSubcat ? 'bg-muted/20 ml-6' : 'bg-muted/30'}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {!isSubcat && subs.length > 0 ? (
              <button
                onClick={() => toggleExpand(category.id)}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <ChevronRight
                  size={16}
                  className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            ) : (
              <div className="w-4 flex-shrink-0" />
            )}

            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />

            <div className="flex items-center gap-2 min-w-0">
              {isSubcat
                ? <Tag size={13} className="text-muted-foreground flex-shrink-0" />
                : subs.length > 0
                  ? <FolderOpen size={13} className="text-muted-foreground flex-shrink-0" />
                  : null
              }
              <span className="text-sm font-medium text-foreground truncate">{category.name}</span>
              {subs.length > 0 && !isSubcat && (
                <span className="text-xs text-muted-foreground flex-shrink-0">({subs.length})</span>
              )}
              {/* Subtype badge for transaction parent categories */}
              {!isSubcat && category.type === 'transaction' && category.subtype && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  category.subtype === 'income'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {category.subtype === 'income' ? 'Income' : 'Expense'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0 flex-shrink-0">
            {!isSubcat && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                title="Add subcategory"
                onClick={() => openAddSub(category)}
              >
                <Plus size={14} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => openEdit(category)}
            >
              <Edit size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-red-500 hover:text-white"
              onClick={() => handleDelete(category)}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </div>

        {(isExpanded || searchQuery) && visibleSubs.length > 0 && (
          <div className="mt-1 space-y-1">
            {visibleSubs.map(sub => (
              <CategoryRow key={sub.id} category={sub} isSubcat />
            ))}
          </div>
        )}
      </div>
    );
  };

  const CategoryList = ({ type }: { type: 'transaction' | 'task' | 'note' }) => {
    const parents = getCategoriesByType(type);

    if (loading) {
      return <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
    }

    const visibleParents = parents.filter(p => {
      if (type === 'transaction' && subtypeFilter !== 'all') {
        if (p.subtype !== subtypeFilter) return false;
      }
      if (!searchQuery) return true;
      return matchesSearch(p) || getSubcategories(p.id).some(matchesSearch);
    });

    return (
      <div
        className="cat-list-scroll space-y-2 overflow-y-auto"
        style={{ maxHeight: '420px', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {visibleParents.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">
            {searchQuery ? 'No categories found' : 'No categories yet'}
          </p>
        ) : (
          visibleParents.map(cat => <CategoryRow key={cat.id} category={cat} />)
        )}
      </div>
    );
  };

  // ─── Dialog title ────────────────────────────────────────────

  const dialogTitle = dialogMode === 'edit'
    ? 'Edit Category'
    : dialogMode === 'add-sub'
      ? `Add Subcategory to "${selectedParent?.name}"`
      : 'Add New Category';

  const countWithSubs = (type: 'transaction' | 'task' | 'note') => {
    const parents = getCategoriesByType(type);
    return parents.length + parents.reduce((sum, p) => sum + getSubcategories(p.id).length, 0);
  };

  // Whether to show subtype selector
  const showSubtypeSelector =
    (dialogMode === 'add-parent' && formData.type === 'transaction') ||
    (dialogMode === 'edit' && editingCategory?.type === 'transaction' && !editingCategory?.parentId);

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <style>{`.cat-list-scroll::-webkit-scrollbar { display: none; }`}</style>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage categories for all your data</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border border-border shadow-sm"
        />
      </div>

      {/* Category List */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">Category List</CardTitle>
            <Button size="sm" className="gap-2" onClick={() => openAddParent(activeTab)}>
              <Plus size={15} /> Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="transaction" onValueChange={(v) => setActiveTab(v as 'transaction' | 'task' | 'note')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transaction">Transactions ({countWithSubs('transaction')})</TabsTrigger>
              <TabsTrigger value="task">Tasks ({countWithSubs('task')})</TabsTrigger>
              <TabsTrigger value="note">Notes ({countWithSubs('note')})</TabsTrigger>
            </TabsList>
            <TabsContent value="transaction" className="mt-4">
              {/* Subtype filter pills */}
              <div className="flex gap-2 mb-4">
                {([
                  { value: 'all', label: 'All' },
                  { value: 'income', label: 'Income' },
                  { value: 'expense', label: 'Expense' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSubtypeFilter(opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      subtypeFilter === opt.value
                        ? opt.value === 'income'
                          ? 'bg-green-600 text-white border-green-600'
                          : opt.value === 'expense'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <CategoryList type="transaction" />
            </TabsContent>
            <TabsContent value="task" className="mt-4">
              <CategoryList type="task" />
            </TabsContent>
            <TabsContent value="note" className="mt-4">
              <CategoryList type="note" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-semibold">
              {dialogTitle}
            </DialogTitle>
            {dialogMode === 'add-sub' && selectedParent && (
              <p className="text-sm text-muted-foreground mt-1">
                This subcategory will appear under <span className="font-medium text-foreground">{selectedParent.name}</span>
              </p>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                {dialogMode === 'add-sub' ? 'Subcategory Name' : 'Category Name'}
              </Label>
              <Input
                id="name"
                placeholder={dialogMode === 'add-sub' ? 'e.g. Restaurant, Coffee' : 'e.g. Food, Transport'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Type selector — only for new parent categories */}
            {dialogMode === 'add-parent' && (
              <div className="space-y-1.5">
                <Label>Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['transaction', 'task', 'note'] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={formData.type === t ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, type: t, subtype: '' })}
                    >
                      {t === 'transaction' ? 'Transaction' : t === 'task' ? 'Task' : 'Note'}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtype selector — only for transaction parent categories */}
            {showSubtypeSelector && (
              <div className="space-y-1.5">
                <Label>Subtype</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'income', label: 'Income' },
                    { value: 'expense', label: 'Expense' },
                  ] as const).map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={formData.subtype === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, subtype: opt.value })}
                      className={
                        formData.subtype === opt.value && opt.value === 'income'
                          ? 'bg-green-600 hover:bg-green-700 border-green-600'
                          : formData.subtype === opt.value && opt.value === 'expense'
                            ? 'bg-red-600 hover:bg-red-700 border-red-600'
                            : ''
                      }
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.subtype === 'income'
                    ? 'This category will only appear when adding income transactions.'
                    : formData.subtype === 'expense'
                      ? 'This category will only appear when adding expense transactions.'
                      : 'Please select income or expense.'}
                </p>
              </div>
            )}

            {/* Parent info badge — for add-sub mode */}
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
                  }`}>
                    {selectedParent.subtype === 'income' ? 'Income' : 'Expense'}
                  </span>
                )}
              </div>
            )}

            {/* Color */}
            <div className="space-y-1.5">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-3 items-center">
                <input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1 font-mono text-sm"
                />
                <div className="w-8 h-8 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: formData.color }} />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Save size={15} />{dialogMode === 'edit' ? 'Update' : 'Save'}</>
              }
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}