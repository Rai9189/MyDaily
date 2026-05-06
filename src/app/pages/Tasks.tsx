// src/app/pages/Tasks.tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { useCategories } from '../context/CategoryContext';
import { stripHtml } from '../components/RichTextEditor';
import { useViewPreferences } from '../hooks/useViewPreferences';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import {
  Plus, AlertCircle, Clock, CheckCircle2, ArrowUpDown,
  ChevronLeft, ChevronRight, Filter, Paperclip,
  Search, X, Edit, Trash2, CalendarX,
  LayoutGrid, List,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListPageSkeleton } from '../components/Skeletons';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Tasks() {
  const navigate = useNavigate();
  const { tasks, loading, error, deleteTask, completeTask, uncompleteTask } = useTasks();
  const { categories, getEffectiveCategoryName, getEffectiveCategoryColor } = useCategories();

  const { itemsPerPage, setItemsPerPage, viewMode, setViewMode } = useViewPreferences('tasks');

  const [searchQuery, setSearchQuery]         = useState('');
  const [filterStatus, setFilterStatus]       = useState('all');
  const [filterCategory, setFilterCategory]   = useState('all');
  const [filterCompleted, setFilterCompleted] = useState('active');
  const [sortBy, setSortBy]                   = useState<'deadline' | 'status'>('deadline');
  const [sortOrder, setSortOrder]             = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage]         = useState(1);
  const [filterOpen, setFilterOpen]           = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  const taskCategories = categories.filter(c => c.type === 'task');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (filterRef.current && filterRef.current.contains(target)) return;
      if (target.closest('[data-radix-popper-content-wrapper]') || target.closest('[role="option"]')) return;
      setFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCategoryName  = (id: string, subId?: string | null) => getEffectiveCategoryName(id, subId);
  const getCategoryColor = (id: string, subId?: string | null) => getEffectiveCategoryColor(id, subId);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'overdue':  return { label: 'Overdue',  icon: <CalendarX size={12} />,    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' };
      case 'urgent':   return { label: 'Urgent',   icon: <AlertCircle size={12} />,  className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' };
      case 'upcoming': return { label: 'Upcoming', icon: <Clock size={12} />,        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
      case 'on_track': return { label: 'On Track', icon: <CheckCircle2 size={12} />, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' };
      default:         return { label: status, icon: null, className: 'bg-muted text-muted-foreground border-border' };
    }
  };

  const StatusBadge = ({ task }: { task: any }) => {
    if (task.completed) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
        <CheckCircle2 size={11} /> Completed
      </span>
    );
    const cfg = getStatusConfig(task.status);
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}>
        {cfg.icon}{cfg.label}
      </span>
    );
  };

  const getDotColor = (task: any) => {
    if (task.completed) return 'bg-gray-400';
    switch (task.status) {
      case 'overdue':  return 'bg-red-600';
      case 'urgent':   return 'bg-orange-500';
      case 'upcoming': return 'bg-amber-500';
      default:         return 'bg-blue-500';
    }
  };

  const getCardBorder = (task: any) => {
    if (task.completed)             return 'border-slate-200 dark:border-border/60 opacity-60';
    if (task.status === 'overdue')  return 'border-red-300 dark:border-red-800';
    if (task.status === 'urgent')   return 'border-orange-200 dark:border-orange-800';
    if (task.status === 'upcoming') return 'border-amber-200 dark:border-amber-800';
    return 'border-blue-200 dark:border-blue-900/50';
  };

  const getDaysInfo = (deadline: string, completed: boolean) => {
    if (completed) return { label: 'Completed', color: 'text-muted-foreground' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due   = new Date(deadline); due.setHours(0, 0, 0, 0);
    const days  = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0)   return { label: `${Math.abs(days)}d overdue`, color: 'text-red-600 dark:text-red-400 font-semibold' };
    if (days === 0) return { label: 'Due today',    color: 'text-orange-600 dark:text-orange-400 font-semibold' };
    if (days === 1) return { label: 'Due tomorrow', color: 'text-amber-600 dark:text-amber-400' };
    if (days <= 7)  return { label: `${days}d left`, color: 'text-amber-500 dark:text-amber-400' };
    return { label: `${days}d left`, color: 'text-muted-foreground' };
  };

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        getCategoryName(t.categoryId, t.subcategoryId).toLowerCase().includes(q)
      );
    }
    if (filterStatus   !== 'all') result = result.filter(t => t.status === filterStatus);
    if (filterCategory !== 'all') result = result.filter(t => t.categoryId === filterCategory || t.subcategoryId === filterCategory);
    if (filterCompleted === 'completed') result = result.filter(t =>  t.completed);
    if (filterCompleted === 'active')    result = result.filter(t => !t.completed);

    result.sort((a, b) => {
      if (sortBy === 'deadline') {
        const deadlineDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        // ✅ Jika deadline sama, pakai createdAt sebagai tiebreaker
        if (deadlineDiff !== 0) return sortOrder === 'asc' ? deadlineDiff : -deadlineDiff;
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        // Task yang dibuat lebih baru muncul lebih atas
        return bCreated - aCreated;
      }
      const order = { overdue: 4, urgent: 3, upcoming: 2, on_track: 1 };
      const va = order[a.status as keyof typeof order] ?? 0;
      const vb = order[b.status as keyof typeof order] ?? 0;
      return sortOrder === 'asc' ? vb - va : va - vb;
    });

    return result;
  }, [tasks, searchQuery, filterStatus, filterCategory, filterCompleted, sortBy, sortOrder]);

  useMemo(() => { setCurrentPage(1); }, [searchQuery, filterStatus, filterCategory, filterCompleted, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all') return 1;
    return Math.ceil(filteredTasks.length / (itemsPerPage as number));
  }, [filteredTasks.length, itemsPerPage]);

  const paginatedTasks = useMemo(() => {
    if (itemsPerPage === 'all') return filteredTasks;
    const start = (currentPage - 1) * (itemsPerPage as number);
    return filteredTasks.slice(start, start + (itemsPerPage as number));
  }, [filteredTasks, currentPage, itemsPerPage]);

  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * (itemsPerPage as number);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 3)              { pages.push(1, 2, 3, 4, '...', totalPages); }
    else if (currentPage >= totalPages - 2) { pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages); }
    else { pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages); }
    return pages;
  };

  const activeFilterCount = [filterStatus !== 'all', filterCategory !== 'all', filterCompleted !== 'active'].filter(Boolean).length;

  const resetFilters = () => {
    setFilterStatus('all'); setFilterCategory('all'); setFilterCompleted('active');
    setSortBy('deadline'); setSortOrder('asc'); setCurrentPage(1);
  };

  const handleDeleteRequest = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    setDeleteTarget({ id: task.id, name: task.title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { success, error } = await deleteTask(deleteTarget.id);
    if (success) toast.success('Task deleted');
    else toast.error(error || 'Failed to delete task');
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/tasks/${id}`);
  };

  const handleToggleComplete = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    const { success, error: err } = task.completed
      ? await uncompleteTask(task.id)
      : await completeTask(task.id);
    if (!success) toast.error(err || 'Failed to update task');
  };

  if (loading) return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <ListPageSkeleton rows={6} />
      </div>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
      <p className="text-red-600 dark:text-red-400">Error: {error}</p>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        icon={<Trash2 size={20} />}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex-shrink-0 space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-foreground/65">Manage All Your Tasks</p>
          <Button onClick={() => navigate('/tasks/new')} className="hidden md:flex gap-2">
            <Plus size={18} /> Add Task
          </Button>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 text-xs items-center">
            {filterStatus !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                Status: {getStatusConfig(filterStatus).label}
                <button onClick={() => { setFilterStatus('all'); setCurrentPage(1); }} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            {filterCategory !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                Category: {categories.find(c => c.id === filterCategory)?.name}
                <button onClick={() => { setFilterCategory('all'); setCurrentPage(1); }} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            {filterCompleted !== 'active' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                {filterCompleted === 'completed' ? 'Completed only' : 'All (incl. completed)'}
                <button onClick={() => { setFilterCompleted('active'); setCurrentPage(1); }} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            <button onClick={resetFilters} className="text-foreground/60 hover:text-foreground underline text-xs font-medium">Clear All</button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input placeholder="Search tasks..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10 border border-border shadow-sm" />
          </div>

          <div className="relative" ref={filterRef}>
            <Button variant="outline" className="gap-2 relative" onClick={() => setFilterOpen(prev => !prev)}>
              <Filter size={18} />
              <span className="hidden sm:inline">Filter & Sort</span>
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
                    {activeFilterCount > 0 && <button onClick={resetFilters} className="text-xs text-primary hover:underline">Reset All</button>}
                    <button onClick={() => setFilterOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                    <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="on_track">On Track</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
                    <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
                      <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {taskCategories.filter(c => !c.parentId).map(parent => (
                          <div key={parent.id}>
                            <SelectItem value={parent.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: parent.color }} />
                                <span className="font-medium">{parent.name}</span>
                              </div>
                            </SelectItem>
                            {taskCategories.filter(c => c.parentId === parent.id).map(sub => (
                              <SelectItem key={sub.id} value={sub.id}>
                                <div className="flex items-center gap-2 pl-4">
                                  <span className="text-muted-foreground text-xs">└</span>
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color || parent.color }} />
                                  <span className="text-sm">{sub.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completion</label>
                    <div className="flex gap-2">
                      {([{ value: 'active', label: 'Active' }, { value: 'all', label: 'All' }, { value: 'completed', label: 'Completed' }] as const).map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => { setFilterCompleted(opt.value); setCurrentPage(1); }}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterCompleted === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Default: Active only</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort By</label>
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={(v: 'deadline' | 'status') => setSortBy(v)}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deadline">Deadline</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                        <ArrowUpDown size={15} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-foreground/65">Show:</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden bg-muted/40 p-0.5 gap-0.5">
            {([5, 10, 20, 'all'] as (number | 'all')[]).map((num) => (
              <button key={num} onClick={() => { setItemsPerPage(num); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${itemsPerPage === num ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground hover:bg-background'}`}>
                {num === 'all' ? 'All' : num}
              </button>
            ))}
          </div>
          <div className="hidden md:inline-flex rounded-lg border border-border overflow-hidden bg-muted/40 p-0.5 gap-0.5">
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all duration-150 ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground hover:bg-background'}`}
              title="List View"><List size={16} /></button>
            <button onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all duration-150 ${viewMode === 'card' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground hover:bg-background'}`}
              title="Card View"><LayoutGrid size={16} /></button>
          </div>
          <span className="text-sm font-medium text-foreground/65 ml-auto">
            {itemsPerPage === 'all' ? `Showing All ${filteredTasks.length} Tasks` : `Page ${currentPage} Of ${totalPages} (${filteredTasks.length} Total)`}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
        {filteredTasks.length === 0 ? (
          <Card className="border-2 border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No Tasks Found</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="rounded-xl overflow-hidden w-full bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-100 dark:divide-border">
                <thead className="bg-slate-100 dark:bg-muted/60">
                  <tr>
                    <th className="pl-4 pr-2 py-3 w-8" />
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Deadline</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-border/50">
                  {paginatedTasks.map((task) => {
                    const daysInfo = getDaysInfo(task.deadline, task.completed);
                    return (
                      <tr key={task.id}
                        className={`group hover:bg-slate-50 dark:hover:bg-muted/40 cursor-pointer transition-colors ${task.completed ? 'opacity-60' : ''}`}
                        onClick={() => navigate(`/tasks/${task.id}`)}>
                        <td className={`pl-4 pr-2 ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleComplete(e, task)}
                            title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                              task.completed
                                ? 'bg-gray-400 border-gray-400'
                                : `bg-transparent ${task.status === 'overdue' ? 'border-red-600' : task.status === 'urgent' ? 'border-orange-500' : task.status === 'upcoming' ? 'border-amber-500' : 'border-blue-500'}`
                            }`}
                          >
                            {task.completed && (
                              <svg viewBox="0 0 10 10" width="8" height="8" fill="none">
                                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        </td>
                        <td className={`px-4 text-center ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`}>
                          <div className="relative inline-block">
                            <p className={`text-sm font-semibold leading-tight ${task.completed ? 'line-through text-slate-400' : 'text-foreground'}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block pointer-events-none">
                                <div className="bg-foreground text-background text-xs rounded-lg px-3 py-1.5 whitespace-nowrap max-w-[220px] truncate shadow-lg">
                                  {stripHtml(task.description)}
                                </div>
                                <div className="w-2 h-2 bg-foreground rotate-45 mx-auto -mt-1" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 text-center whitespace-nowrap ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`}>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full border inline-block"
                            style={{ borderColor: getCategoryColor(task.categoryId, task.subcategoryId), color: getCategoryColor(task.categoryId, task.subcategoryId) }}>
                            {getCategoryName(task.categoryId, task.subcategoryId)}
                          </span>
                        </td>
                        <td className={`px-4 whitespace-nowrap text-center ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`}>
                          <p className="text-sm text-slate-500 dark:text-foreground/65">
                            {new Date(task.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className={`text-xs mt-0.5 ${daysInfo.color}`}>{daysInfo.label}</p>
                        </td>
                        <td className={`px-4 whitespace-nowrap text-center ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`}>
                          <StatusBadge task={task} />
                        </td>
                        <td className={`px-4 whitespace-nowrap text-center ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`} onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-foreground"
                              onClick={(e) => handleEdit(e, task.id)}><Edit size={14} /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-red-500 hover:text-white"
                              onClick={(e) => handleDeleteRequest(e, task)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedTasks.map((task) => {
              const daysInfo = getDaysInfo(task.deadline, task.completed);
              return (
                <Card key={task.id} className={`hover:shadow-lg transition-all bg-white dark:bg-card cursor-pointer border-2 ${getCardBorder(task)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={(e) => handleToggleComplete(e, task)}
                        title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                        className={`mt-1 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                          task.completed
                            ? 'bg-gray-400 border-gray-400'
                            : `bg-transparent ${task.status === 'overdue' ? 'border-red-600' : task.status === 'urgent' ? 'border-orange-500' : task.status === 'upcoming' ? 'border-amber-500' : 'border-blue-500'}`
                        }`}
                      >
                        {task.completed && (
                          <svg viewBox="0 0 10 10" width="8" height="8" fill="none">
                            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0" onClick={() => navigate(`/tasks/${task.id}`)}>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
                            style={{ borderColor: getCategoryColor(task.categoryId, task.subcategoryId), color: getCategoryColor(task.categoryId, task.subcategoryId) }}>
                            {getCategoryName(task.categoryId, task.subcategoryId)}
                          </span>
                          <StatusBadge task={task} />
                        </div>
                        <p className={`text-sm font-semibold leading-tight ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{stripHtml(task.description)}</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock size={11} className="opacity-70" />
                              {new Date(task.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className={`text-xs mt-0.5 ${daysInfo.color}`}>{daysInfo.label}</p>
                          </div>
                          {task.completionAttachments && task.completionAttachments.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Paperclip size={11} /> {task.completionAttachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-foreground"
                          onClick={(e) => handleEdit(e, task.id)}><Edit size={13} /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-red-500 hover:text-white"
                          onClick={(e) => handleDeleteRequest(e, task)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {itemsPerPage !== 'all' && totalPages > 1 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 bg-white dark:bg-card border-t-2 border-slate-200 dark:border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] py-3 px-6">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm font-medium text-foreground/65">
              Showing {startIndex + 1}–{Math.min(startIndex + (itemsPerPage as number), filteredTasks.length)} of {filteredTasks.length}
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="gap-1">
                <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex gap-1">
                {getPageNumbers().map((page, index) =>
                  page === '...' ? (
                    <span key={`e-${index}`} className="px-2 py-1.5 text-sm text-foreground/50">...</span>
                  ) : (
                    <button key={page} onClick={() => setCurrentPage(page as number)}
                      className={`min-w-[36px] px-2 py-1.5 text-sm rounded-md transition-colors font-medium ${currentPage === page ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground/70 hover:bg-muted'}`}>
                      {page}
                    </button>
                  )
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="gap-1">
                <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
      {itemsPerPage !== 'all' && totalPages > 1 && <div className="h-16 flex-shrink-0" />}
    </div>
  );
}