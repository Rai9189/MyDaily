import { useState } from 'react';
import { dummyCategories } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Category } from '../types';

export function Categories() {
  const [categories, setCategories] = useState<Category[]>(dummyCategories);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'transaction' | 'task' | 'note'>('transaction');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');

  const filterCategories = (items: Category[]) => {
    if (!searchQuery) return items;
    return items.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const transactionCategories = filterCategories(categories.filter(c => c.type === 'transaction'));
  const taskCategories = filterCategories(categories.filter(c => c.type === 'task'));
  const noteCategories = filterCategories(categories.filter(c => c.type === 'note'));

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory: Category = {
      id: `new-${Date.now()}`,
      name: newCategoryName,
      type: newCategoryType,
      color: newCategoryColor,
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setIsDialogOpen(false);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const CategoryList = ({ items, type }: { items: Category[], type: string }) => (
    <div className="space-y-2">
      {items.map((category) => (
        <Card key={category.id} className="dark:bg-gray-700 dark:border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="dark:text-white">{category.name}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {items.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          {searchQuery ? 'Tidak ada kategori ditemukan' : 'Belum ada kategori'}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl dark:text-white">Kategori</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola kategori untuk semua data</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={20} />
              Tambah Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Tambah Kategori Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name" className="dark:text-gray-300">Nama Kategori</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Makanan"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <Label className="dark:text-gray-300">Tipe</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={newCategoryType === 'transaction' ? 'default' : 'outline'}
                    onClick={() => setNewCategoryType('transaction')}
                  >
                    Transaksi
                  </Button>
                  <Button
                    type="button"
                    variant={newCategoryType === 'task' ? 'default' : 'outline'}
                    onClick={() => setNewCategoryType('task')}
                  >
                    Tugas
                  </Button>
                  <Button
                    type="button"
                    variant={newCategoryType === 'note' ? 'default' : 'outline'}
                    onClick={() => setNewCategoryType('note')}
                  >
                    Note
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="color" className="dark:text-gray-300">Warna</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="color"
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <Button onClick={handleAddCategory} className="w-full">
                Simpan Kategori
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Cari kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Daftar Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="transaction">
            <TabsList className="grid w-full grid-cols-3 dark:bg-gray-700">
              <TabsTrigger value="transaction" className="dark:data-[state=active]:bg-gray-600">
                Transaksi ({transactionCategories.length})
              </TabsTrigger>
              <TabsTrigger value="task" className="dark:data-[state=active]:bg-gray-600">
                Tugas ({taskCategories.length})
              </TabsTrigger>
              <TabsTrigger value="note" className="dark:data-[state=active]:bg-gray-600">
                Notes ({noteCategories.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transaction" className="mt-4">
              <CategoryList items={transactionCategories} type="transaction" />
            </TabsContent>

            <TabsContent value="task" className="mt-4">
              <CategoryList items={taskCategories} type="task" />
            </TabsContent>

            <TabsContent value="note" className="mt-4">
              <CategoryList items={noteCategories} type="note" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
