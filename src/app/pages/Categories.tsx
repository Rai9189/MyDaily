import { useState } from 'react';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Trash2, Search, Loader2, Save } from 'lucide-react';
import { Category } from '../types';

export function Categories() {
  const { categories, loading, error, getCategoriesByType, createCategory, updateCategory, deleteCategory } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'transaction' as 'transaction' | 'task' | 'note',
    color: '#3b82f6',
  });
  const [submitting, setSubmitting] = useState(false);

  const filterCategories = (items: Category[]) => {
    if (!searchQuery) return items;
    return items.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const transactionCategories = filterCategories(getCategoriesByType('transaction'));
  const taskCategories = filterCategories(getCategoriesByType('task'));
  const noteCategories = filterCategories(getCategoriesByType('note'));

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, type: category.type, color: category.color || '#3b82f6' });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', type: 'transaction', color: '#3b82f6' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCategory) {
        const { success, error } = await updateCategory(editingCategory.id, formData);
        if (success) setIsDialogOpen(false);
        else alert(error || 'Failed to update category');
      } else {
        const { success, error } = await createCategory(formData);
        if (success) setIsDialogOpen(false);
        else alert(error || 'Failed to create category');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    const { success, error } = await deleteCategory(id);
    if (!success) alert(error || 'Failed to delete category');
  };

  const CategoryList = ({ items }: { items: Category[] }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-10 text-sm">
          {searchQuery ? 'No categories found' : 'No categories yet'}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
              <span className="text-sm font-medium text-foreground">{category.name}</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => handleOpenDialog(category)}
              >
                <Edit size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(category.id)}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage categories for all your data</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus size={18} />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground text-lg font-semibold">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Food, Transport"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['transaction', 'task', 'note'] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={formData.type === t ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, type: t })}
                      className="capitalize"
                    >
                      {t === 'transaction' ? 'Transaction' : t === 'task' ? 'Task' : 'Note'}
                    </Button>
                  ))}
                </div>
              </div>

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
                  : <><Save size={15} />{editingCategory ? 'Update Category' : 'Save Category'}</>
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
          <CardTitle className="text-base font-semibold text-foreground">Category List</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="transaction">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transaction">
                Transactions ({transactionCategories.length})
              </TabsTrigger>
              <TabsTrigger value="task">
                Tasks ({taskCategories.length})
              </TabsTrigger>
              <TabsTrigger value="note">
                Notes ({noteCategories.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transaction" className="mt-4">
              <CategoryList items={transactionCategories} />
            </TabsContent>
            <TabsContent value="task" className="mt-4">
              <CategoryList items={taskCategories} />
            </TabsContent>
            <TabsContent value="note" className="mt-4">
              <CategoryList items={noteCategories} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}