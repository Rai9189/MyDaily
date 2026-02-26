import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Plus, AlertCircle, Clock, CheckCircle2, ArrowUpDown, List, LayoutGrid, ChevronLeft, ChevronRight, Filter, Search, Loader2, X, Pencil, Trash2 } from 'lucide-react';

export function Tasks() {
  const navigate = useNavigate();
  const { tasks, loading, error, deleteTask } = useTasks();
  const { getCategoriesByType } = useCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCompleted, setFilterCompleted] = useState('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'status'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const taskCategories = getCategoriesByType('task');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCategoryName = (categoryId: string) =>
    taskCategories.find(c => c.id === categoryId)?.name || 'Other';

  const getCategoryColor = (categoryId: string) =>
    taskCategories.find(c => c.id === categoryId)?.color || '#6b7280';

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Mendesak': return 'destructive';
      case 'Mendekati': return 'default';
      case 'Masih Lama': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Mendesak': return 'Urgent';
      case 'Mendekati': return 'Upcoming';
      case 'Masih Lama': return 'On Track';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Mendesak': return <AlertCircle size={13} />;
      case 'Mendekati': return <Clock size={13} />;
      case 'Masih Lama': return <CheckCircle2 size={13} />;
      default: return null;
    }
  };

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        getCategoryName(t.categoryId).toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    if (filterCategory !== 'all') result = result.filter(t => t.categoryId === filterCategory);
    if (filterCompleted === 'completed') result = result.filter(t => t.completed);
    if (filterCompleted === 'active') result = result.filter(t => !t.completed);
    result.sort((a, b) => {
      if (sortBy === 'deadline') {
        return sortOrder === 'asc'
          ? new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          : new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      } else {
        const order = { 'Mendesak': 3, 'Mendekati': 2, 'Masih Lama': 1 };
        const va = order[a.status as keyof typeof order] ?? 0;
        const vb = order[b.status as keyof typeof order] ?? 0;
        return sortOrder === 'asc' ? va - vb : vb - va;
      }
    });
    return result;
  }, [tasks, searchQuery, filterStatus, filterCategory, filterCompleted, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = viewMode === 'card'
    ? filteredTasks.slice(startIndex, startIndex + itemsPerPage)
    : filteredTasks;

  const activeFilterCount = [
    filterStatus !== 'all',
    filterCategory !== 'all',
    filterCompleted !== 'all',
  ].filter(Boolean).length;

  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilterStatus('all');
    setFilterCategory('all');
    setFilterCompleted('all');
    setSortBy('deadline');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this task?')) return;
    setDeletingId(id);
    const { success, error } = await deleteTask(id);
    if (!success) alert(error || 'Failed to delete task');
    setDeletingId(null);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/tasks/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
    <div className="space-y-6 p-1">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage all your tasks</p>
        </div>
        <Button onClick={() => navigate('/tasks/new')} className="gap-2">
          <Plus size={18} /> Add Task
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input placeholder="Search by title, description, or category..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 border border-border shadow-sm" />
        </div>

        <div className="relative" ref={filterRef}>
          <Button variant="outline" className="gap-2 relative" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter size={18} /> Filter
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-foreground">Filter & Sort</span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && <button onClick={resetFilters} className="text-xs text-primary hover:underline">Reset all</button>}
                  <button onClick={() => setFilterOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                  <Select value={filterStatus} onValueChange={(v) => handleFilterChange(setFilterStatus, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Mendesak">Urgent</SelectItem>
                      <SelectItem value="Mendekati">Upcoming</SelectItem>
                      <SelectItem value="Masih Lama">On Track</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
                  <Select value={filterCategory} onValueChange={(v) => handleFilterChange(setFilterCategory, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {taskCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completion</label>
                  <Select value={filterCompleted} onValueChange={(v) => handleFilterChange(setFilterCompleted, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort by</label>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(v: 'deadline' | 'status') => setSortBy(v)}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deadline">Deadline</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                      <ArrowUpDown size={16} />
                    </Button>
                  </div>
                </div>
                <div className="border-t border-border pt-3 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">View</label>
                  <div className="flex gap-2">
                    <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} className="gap-2 flex-1">
                      <List size={15} /> List
                    </Button>
                    <Button variant={viewMode === 'card' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('card')} className="gap-2 flex-1">
                      <LayoutGrid size={15} /> Card
                    </Button>
                  </div>
                </div>
                {viewMode === 'card' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per page</label>
                    <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredTasks.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
        </p>
      )}

      {filteredTasks.length === 0 ? (
        <Card className="border border-border bg-card">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No tasks found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {paginatedTasks.map((task) => (
            <Card key={task.id} className={`hover:shadow-md transition-shadow border border-border bg-card ${task.completed ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Status dot */}
                  <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
                    task.completed ? 'bg-gray-400' :
                    task.status === 'Mendesak' ? 'bg-red-500' :
                    task.status === 'Mendekati' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />

                  {/* Info — klik untuk buka detail */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                    <p className={`text-sm font-medium text-foreground ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      {!task.completed ? (
                        <Badge variant={getStatusVariant(task.status) as any} className="gap-1 text-xs">
                          {getStatusIcon(task.status)}
                          {getStatusLabel(task.status)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <CheckCircle2 size={11} /> Completed
                        </Badge>
                      )}
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
                        style={{ borderColor: getCategoryColor(task.categoryId), color: getCategoryColor(task.categoryId) }}>
                        {getCategoryName(task.categoryId)}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      Due {new Date(task.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* ✅ Tombol Edit + Delete sejajar horizontal */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => handleEdit(e, task.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      title="Edit task">
                      <Pencil size={14} />
                    </button>
                    <button onClick={(e) => handleDelete(e, task.id)} disabled={deletingId === task.id}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      title="Delete task">
                      {deletingId === task.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'card' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm text-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}