import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Plus, AlertCircle, Clock, CheckCircle2, ArrowUpDown, List, LayoutGrid, ChevronLeft, ChevronRight, Filter, Search, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';

export function Tasks() {
  const navigate = useNavigate();
  const { tasks, loading, error } = useTasks();
  const { getCategoriesByType } = useCategories();
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCompleted, setFilterCompleted] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'status'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const taskCategories = getCategoriesByType('task');

  const getCategoryName = (categoryId: string) => {
    return taskCategories.find(c => c.id === categoryId)?.name || 'Lainnya';
  };

  const getCategoryColor = (categoryId: string) => {
    return taskCategories.find(c => c.id === categoryId)?.color || '#gray';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Mendesak': return 'destructive';
      case 'Mendekati': return 'default';
      case 'Masih Lama': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Mendesak': return <AlertCircle size={16} className="text-red-600" />;
      case 'Mendekati': return <Clock size={16} className="text-orange-600" />;
      case 'Masih Lama': return <CheckCircle2 size={16} className="text-green-600" />;
      default: return null;
    }
  };

  // Filter and sort
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => {
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDescription = t.description?.toLowerCase().includes(query);
        const matchesCategory = getCategoryName(t.categoryId).toLowerCase().includes(query);
        return matchesTitle || matchesDescription || matchesCategory;
      });
    }

    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    if (filterCategory !== 'all') result = result.filter(t => t.categoryId === filterCategory);
    if (filterCompleted === 'completed') result = result.filter(t => t.completed);
    if (filterCompleted === 'active') result = result.filter(t => !t.completed);

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'deadline') {
        const dateA = new Date(a.deadline).getTime();
        const dateB = new Date(b.deadline).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const statusOrder = { 'Mendesak': 3, 'Mendekati': 2, 'Masih Lama': 1 };
        const statusA = statusOrder[a.status as keyof typeof statusOrder];
        const statusB = statusOrder[b.status as keyof typeof statusOrder];
        return sortOrder === 'asc' ? statusA - statusB : statusB - statusA;
      }
    });

    return result;
  }, [tasks, searchQuery, filterStatus, filterCategory, filterCompleted, sortBy, sortOrder, taskCategories]);

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = viewMode === 'card' ? filteredTasks.slice(startIndex, endIndex) : filteredTasks;

  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl dark:text-white">Tugas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola semua tugas Anda</p>
        </div>
        <Button onClick={() => navigate('/tasks/new')} className="gap-2">
          <Plus size={20} />
          Tambah Tugas
        </Button>
      </div>

      {/* Search Bar and Filter */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Cari tugas (judul, deskripsi, kategori)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <Filter size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent className="dark:bg-gray-800 dark:text-white overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="dark:text-white">Filter & Sortir</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Filter Status</label>
                    <Select value={filterStatus} onValueChange={(v) => handleFilterChange(setFilterStatus, v)}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="Mendesak">Mendesak</SelectItem>
                        <SelectItem value="Mendekati">Mendekati</SelectItem>
                        <SelectItem value="Masih Lama">Masih Lama</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Filter Kategori</label>
                    <Select value={filterCategory} onValueChange={(v) => handleFilterChange(setFilterCategory, v)}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        {taskCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Status Selesai</label>
                    <Select value={filterCompleted} onValueChange={(v) => handleFilterChange(setFilterCompleted, v)}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="active">Belum Selesai</SelectItem>
                        <SelectItem value="completed">Sudah Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Urutkan</label>
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={(v: 'deadline' | 'status') => setSortBy(v)}>
                        <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deadline">Deadline</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      >
                        <ArrowUpDown size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t dark:border-gray-700">
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Tampilan</label>
                    <div className="flex gap-2">
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="gap-2 flex-1"
                      >
                        <List size={16} />
                        List
                      </Button>
                      <Button
                        variant={viewMode === 'card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                        className="gap-2 flex-1"
                      >
                        <LayoutGrid size={16} />
                        Card
                      </Button>
                    </div>
                  </div>

                  {viewMode === 'card' && (
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Per halaman</label>
                      <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                        setItemsPerPage(parseInt(v));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardContent>
      </Card>

      {/* Task List/Cards */}
      <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
        {paginatedTasks.map((task) => (
          <Card
            key={task.id}
            className={`hover:shadow-lg transition-all cursor-pointer dark:bg-gray-800 dark:border-gray-700 ${task.completed ? 'bg-gray-50 dark:bg-gray-700/50 opacity-75' : ''}`}
            onClick={() => navigate(`/tasks/${task.id}`)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                <h3 className={`text-lg dark:text-white ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                  {task.title}
                </h3>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getStatusColor(task.status)} className="gap-1">
                    {getStatusIcon(task.status)}
                    {task.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: getCategoryColor(task.categoryId),
                      color: getCategoryColor(task.categoryId)
                    }}
                  >
                    {getCategoryName(task.categoryId)}
                  </Badge>
                  {task.completed && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 size={12} />
                      Selesai
                    </Badge>
                  )}
                </div>

                {task.description && (
                  <p className={`text-sm text-gray-600 dark:text-gray-400 ${task.completed ? 'line-through' : ''}`}>
                    {task.description}
                  </p>
                )}

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(task.deadline).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12 text-center text-gray-500 dark:text-gray-400">
            <p>Tidak ada tugas ditemukan</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {viewMode === 'card' && totalPages > 1 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredTasks.length)} dari {filteredTasks.length} tugas
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="dark:bg-gray-700 dark:border-gray-600"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm dark:text-white">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="dark:bg-gray-700 dark:border-gray-600"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}