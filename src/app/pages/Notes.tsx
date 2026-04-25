// src/app/pages/Notes.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Plus, Search, Pin, Paperclip,
  ChevronLeft, ChevronRight, Filter, Loader2, X, Edit, Trash2,
  LayoutGrid, List,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListPageSkeleton } from '../components/Skeletons';
import { ConfirmDialog } from '../components/ConfirmDialog';

type SortOption = 'newest' | 'oldest' | 'az';

// ✅ Strip HTML tags untuk preview plain text
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function Notes() {
  const navigate = useNavigate();
  const { notes, loading, error, deleteNote, togglePin } = useNotes();
  const { categories, getEffectiveCategoryName, getEffectiveCategoryColor } = useCategories();

  const [searchQuery, setSearchQuery]       = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPinned, setFilterPinned]     = useState<'all' | 'pinned' | 'unpinned'>('all');
  const [sortBy, setSortBy]                 = useState<SortOption>('newest');
  const [itemsPerPage, setItemsPerPage]     = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage]       = useState(1);
  const [filterOpen, setFilterOpen]         = useState(false);
  const [pinningId, setPinningId]           = useState<string | null>(null);
  const [viewMode, setViewMode]             = useState<'card' | 'list'>('card');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => { if (!e.matches) setViewMode('card'); };
    if (!mq.matches) setViewMode('card');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const noteCategories = categories.filter(c => c.type === 'note');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (filterRef.current && filterRef.current.contains(target)) return;
      if (
        target.closest('[data-radix-popper-content-wrapper]') ||
        target.closest('[data-radix-select-viewport]') ||
        target.closest('[data-radix-select-content]') ||
        target.closest('[role="option"]') ||
        target.closest('[role="listbox"]')
      ) return;
      setFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCategoryName  = (id: string, subId?: string | null) => getEffectiveCategoryName(id, subId);
  const getCategoryColor = (id: string, subId?: string | null) => getEffectiveCategoryColor(id, subId);

  const filteredNotes = useMemo(() => {
    let result = [...notes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      // ✅ Strip HTML sebelum search agar keyword tidak match tag HTML
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        stripHtml(n.content).toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') result = result.filter(n => n.categoryId === filterCategory || n.subcategoryId === filterCategory);
    if (filterPinned === 'pinned')   result = result.filter(n =>  n.pinned);
    if (filterPinned === 'unpinned') result = result.filter(n => !n.pinned);
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortBy === 'oldest') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (sortBy === 'az')     return a.title.localeCompare(b.title);
      return 0;
    });
    return result;
  }, [notes, searchQuery, filterCategory, filterPinned, sortBy]);

  useMemo(() => { setCurrentPage(1); }, [searchQuery, filterCategory, filterPinned, sortBy, itemsPerPage]);

  const pinnedNotes  = useMemo(() => filterPinned === 'all' ? filteredNotes.filter(n =>  n.pinned) : [], [filteredNotes, filterPinned]);
  const regularNotes = useMemo(() => filterPinned === 'all' ? filteredNotes.filter(n => !n.pinned) : filteredNotes, [filteredNotes, filterPinned]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all') return 1;
    return Math.ceil(regularNotes.length / (itemsPerPage as number));
  }, [regularNotes.length, itemsPerPage]);

  const paginatedNotes = useMemo(() => {
    if (itemsPerPage === 'all') return regularNotes;
    const start = (currentPage - 1) * (itemsPerPage as number);
    return regularNotes.slice(start, start + (itemsPerPage as number));
  }, [regularNotes, currentPage, itemsPerPage]);

  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * (itemsPerPage as number);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 3) { pages.push(1, 2, 3, 4, '...', totalPages); }
    else if (currentPage >= totalPages - 2) { pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages); }
    else { pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages); }
    return pages;
  };

  const activeFilterCount = [filterCategory !== 'all', filterPinned !== 'all'].filter(Boolean).length;

  const handleDeleteRequest = (e: React.MouseEvent, note: any) => {
    e.stopPropagation();
    setDeleteTarget({ id: note.id, name: note.title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { success, error } = await deleteNote(deleteTarget.id);
    if (success) toast.success('Note deleted');
    else toast.error(error || 'Failed to delete note');
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/notes/${id}`);
  };

  const handlePin = async (e: React.MouseEvent, note: any) => {
    e.stopPropagation();
    setPinningId(note.id);
    await togglePin(note.id);
    setPinningId(null);
  };

  const NoteCardView = ({ note }: { note: any }) => {
    const plainContent = stripHtml(note.content); // ✅ strip HTML untuk preview
    return (
      <Card className={`hover:shadow-lg transition-all bg-white dark:bg-card cursor-pointer ${note.pinned ? 'border-2 border-amber-400 dark:border-amber-500' : 'border-2 border-blue-200 dark:border-blue-900/50'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0" onClick={() => navigate(`/notes/${note.id}`)}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
                  style={{ borderColor: getCategoryColor(note.categoryId, note.subcategoryId), color: getCategoryColor(note.categoryId, note.subcategoryId) }}>
                  {getCategoryName(note.categoryId, note.subcategoryId)}
                </span>
                {note.pinned && <Pin size={13} className="text-amber-500" />}
              </div>
              <h3 className="text-sm font-semibold text-foreground line-clamp-1 mt-2">{note.title}</h3>
              {/* ✅ Tampilkan plain text bukan raw HTML */}
              <p className="text-sm text-slate-500 dark:text-muted-foreground line-clamp-3 mt-1">{plainContent}</p>
              {plainContent.length > 200 && <p className="text-xs text-muted-foreground/50 mt-1 italic">Read more...</p>}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-400">
                  {new Date(note.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {note.attachments && note.attachments.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Paperclip size={11} /> {note.attachments.length}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon"
                className={`h-8 w-8 ${note.pinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-foreground'}`}
                onClick={(e) => handlePin(e, note)} disabled={pinningId === note.id}>
                {pinningId === note.id ? <Loader2 size={15} className="animate-spin" /> : <Pin size={15} />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-foreground"
                onClick={(e) => handleEdit(e, note.id)}><Edit size={15} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-red-500 hover:text-white"
                onClick={(e) => handleDeleteRequest(e, note)}>
                <Trash2 size={15} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const TableHeader = () => (
    <thead className="bg-slate-100 dark:bg-muted/60">
      <tr>
        <th className="pl-4 pr-2 py-3 w-8" />
        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Title</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Category</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Date</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Actions</th>
      </tr>
    </thead>
  );

  const NoteTableRow = ({ note, isPinned }: { note: any; isPinned: boolean }) => {
    const plainContent = stripHtml(note.content); // ✅ strip HTML untuk tooltip
    return (
      <tr
        className={`group cursor-pointer transition-colors border-b ${
          isPinned
            ? 'bg-amber-50/70 hover:bg-amber-100/60 dark:bg-amber-900/10 dark:hover:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'
            : 'bg-white hover:bg-slate-50 dark:bg-card dark:hover:bg-muted/40 border-slate-100 dark:border-border/50'
        }`}
        onClick={() => navigate(`/notes/${note.id}`)}>

        <td className="pl-4 pr-2 py-3.5 w-8 text-center">
          <Pin size={14} className={isPinned ? 'text-amber-500 mx-auto' : 'text-slate-200 dark:text-slate-700 mx-auto'} />
        </td>

        <td className="px-4 py-3.5 text-center">
          <div className="relative inline-block">
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm font-semibold text-foreground line-clamp-1">{note.title}</p>
              {note.attachments && note.attachments.length > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-slate-400 flex-shrink-0">
                  <Paperclip size={11} />{note.attachments.length}
                </span>
              )}
            </div>
            {/* ✅ Tooltip pakai plain text */}
            {plainContent && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block pointer-events-none">
                <div className="bg-foreground text-background text-xs rounded-lg px-3 py-1.5 whitespace-nowrap max-w-[260px] truncate shadow-lg">
                  {plainContent}
                </div>
                <div className="w-2 h-2 bg-foreground rotate-45 mx-auto -mt-1" />
              </div>
            )}
          </div>
        </td>

        <td className="px-4 py-3.5 whitespace-nowrap text-center">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border inline-block"
            style={{ borderColor: getCategoryColor(note.categoryId, note.subcategoryId), color: getCategoryColor(note.categoryId, note.subcategoryId) }}>
            {getCategoryName(note.categoryId, note.subcategoryId)}
          </span>
        </td>

        <td className="px-4 py-3.5 whitespace-nowrap text-center">
          <span className="text-sm text-slate-500 dark:text-foreground/65">
            {new Date(note.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </td>

        <td className="px-4 py-3.5 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="icon"
              className={`h-8 w-8 ${isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-foreground'}`}
              onClick={(e) => handlePin(e, note)} disabled={pinningId === note.id}>
              {pinningId === note.id ? <Loader2 size={14} className="animate-spin" /> : <Pin size={14} />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); navigate(`/notes/${note.id}`); }}><Edit size={14} /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-red-500 hover:text-white"
              onClick={(e) => handleDeleteRequest(e, note)}>
              <Trash2 size={14} />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  if (loading) return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar"><ListPageSkeleton rows={5} /></div>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p className="text-red-600 dark:text-red-400">Error: {error}</p>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Note"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        icon={<Trash2 size={20} />}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex-shrink-0 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-foreground/65">Your Personal Notes</p>
          <Button onClick={() => navigate('/notes/new')} className="gap-2"><Plus size={18} /> Add Note</Button>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 text-xs items-center">
            {filterCategory !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                Category: {categories.find(c => c.id === filterCategory)?.name}
                <button onClick={() => { setFilterCategory('all'); setCurrentPage(1); }} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            {filterPinned !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                {filterPinned === 'pinned' ? 'Pinned only' : 'Unpinned only'}
                <button onClick={() => { setFilterPinned('all'); setCurrentPage(1); }} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            <button onClick={() => { setFilterCategory('all'); setFilterPinned('all'); setCurrentPage(1); }}
              className="text-foreground/60 hover:text-foreground underline text-xs font-medium">Clear All</button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input placeholder="Search notes..." value={searchQuery}
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
              <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-semibold text-foreground">Filter & Sort</span>
                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <button onClick={() => { setFilterCategory('all'); setFilterPinned('all'); setCurrentPage(1); }} className="text-xs text-primary hover:underline">Reset All</button>
                    )}
                    <button onClick={() => setFilterOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
                    <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
                      <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {noteCategories.filter(c => !c.parentId).map(parent => (
                          <div key={parent.id}>
                            <SelectItem value={parent.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: parent.color }} />
                                <span className="font-medium">{parent.name}</span>
                              </div>
                            </SelectItem>
                            {noteCategories.filter(c => c.parentId === parent.id).map(sub => (
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
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pin Status</label>
                    <div className="flex gap-2">
                      {([{ value: 'all', label: 'All' }, { value: 'pinned', label: '📌 Pinned' }, { value: 'unpinned', label: 'Unpinned' }] as const).map(opt => (
                        <button key={opt.value} type="button" onClick={() => { setFilterPinned(opt.value); setCurrentPage(1); }}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterPinned === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort By</label>
                    <div className="flex gap-2">
                      {([{ key: 'newest', label: 'Newest' }, { key: 'oldest', label: 'Oldest' }, { key: 'az', label: 'A–Z' }] as { key: SortOption; label: string }[]).map(s => (
                        <button key={s.key} type="button" onClick={() => setSortBy(s.key)}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${sortBy === s.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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
            {itemsPerPage === 'all' ? `Showing All ${filteredNotes.length} Notes` : `Page ${currentPage} Of ${totalPages} (${filteredNotes.length} Total)`}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
        {filteredNotes.length === 0 ? (
          <Card className="border-2 border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">{searchQuery ? 'No Notes Found' : 'No Notes Yet'}</p>
              <p className="text-sm text-muted-foreground/60 mt-1">{searchQuery ? 'Try adjusting your search or filters' : 'Create your first note'}</p>
            </CardContent>
          </Card>
        ) : viewMode === 'card' ? (
          <div className="space-y-6">
            {pinnedNotes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pin size={16} className="text-amber-500" />
                  <h2 className="text-base font-semibold text-foreground">Pinned ({pinnedNotes.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pinnedNotes.map(note => <NoteCardView key={note.id} note={note} />)}
                </div>
              </div>
            )}
            {regularNotes.length > 0 && (
              <div>
                {filterPinned === 'all' && (
                  <h2 className="text-base font-semibold text-foreground mb-3">
                    All Notes <span className="text-foreground/50 font-normal">({regularNotes.length}{activeFilterCount > 0 ? ` of ${notes.filter(n => !n.pinned).length}` : ''})</span>
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paginatedNotes.map(note => <NoteCardView key={note.id} note={note} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden w-full bg-white dark:bg-card border-2 border-slate-300 dark:border-border shadow-sm">
            <table className="w-full">
              <TableHeader />
              <tbody>
                {pinnedNotes.map((note) => (
                  <NoteTableRow key={note.id} note={note} isPinned={true} />
                ))}
                {pinnedNotes.length > 0 && paginatedNotes.length > 0 && (
                  <tr><td colSpan={5} className="p-0 bg-amber-200/40 dark:bg-amber-900/20" style={{ height: '2px' }} /></tr>
                )}
                {paginatedNotes.map((note) => (
                  <NoteTableRow key={note.id} note={note} isPinned={false} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {itemsPerPage !== 'all' && totalPages > 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-card border-t-2 border-slate-200 dark:border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] py-3 px-6">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm font-medium text-foreground/65">
              Showing {startIndex + 1}–{Math.min(startIndex + (itemsPerPage as number), regularNotes.length)} of {regularNotes.length}
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