import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Pin, Paperclip, List, LayoutGrid, ChevronLeft, ChevronRight, Filter, Loader2, X, Pencil, Trash2 } from 'lucide-react';

export function Notes() {
  const navigate = useNavigate();
  const { notes, loading, error, deleteNote } = useNotes();
  const { getCategoriesByType } = useCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const noteCategories = getCategoriesByType('note');

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
    noteCategories.find(c => c.id === categoryId)?.name || 'Other';

  const getCategoryColor = (categoryId: string) =>
    noteCategories.find(c => c.id === categoryId)?.color || '#6b7280';

  const filteredNotes = useMemo(() => {
    let result = [...notes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') result = result.filter(n => n.categoryId === filterCategory);
    return result;
  }, [notes, searchQuery, filterCategory]);

  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.pinned), [filteredNotes]);
  const regularNotes = useMemo(() => filteredNotes.filter(n => !n.pinned), [filteredNotes]);

  const totalPages = Math.ceil(regularNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotes = viewMode === 'list' ? regularNotes : regularNotes.slice(startIndex, startIndex + itemsPerPage);

  const activeFilterCount = [filterCategory !== 'all'].filter(Boolean).length;

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this note?')) return;
    setDeletingId(id);
    const { success, error } = await deleteNote(id);
    if (!success) alert(error || 'Failed to delete note');
    setDeletingId(null);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/notes/${id}`);
  };

  // ✅ Card view dengan tombol edit + delete
  const NoteCard = ({ note, isPinned }: { note: any; isPinned?: boolean }) => (
    <Card className={`hover:shadow-md transition-shadow border bg-card ${isPinned ? 'border-primary/30' : 'border-border'}`}>
      <CardContent className="p-4">
        {/* Header: title + action buttons */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-foreground line-clamp-1 flex-1 cursor-pointer"
            onClick={() => navigate(`/notes/${note.id}`)}>
            {note.title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isPinned && <Pin size={13} className="text-primary mr-1" />}
            <button onClick={(e) => handleEdit(e, note.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              title="Edit note">
              <Pencil size={14} />
            </button>
            <button onClick={(e) => handleDelete(e, note.id)} disabled={deletingId === note.id}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              title="Delete note">
              {deletingId === note.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </div>

        <div className="cursor-pointer" onClick={() => navigate(`/notes/${note.id}`)}>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border mb-2 inline-block"
            style={{ borderColor: getCategoryColor(note.categoryId), color: getCategoryColor(note.categoryId) }}>
            {getCategoryName(note.categoryId)}
          </span>
          <p className="text-sm text-muted-foreground line-clamp-3 mt-2">{note.content}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground/60">
              {new Date(note.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {note.attachments && note.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip size={11} /> {note.attachments.length}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ✅ List view dengan tombol edit + delete
  const NoteListItem = ({ note, isPinned }: { note: any; isPinned?: boolean }) => (
    <Card className={`hover:shadow-md transition-shadow border bg-card ${isPinned ? 'border-primary/30' : 'border-border'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {isPinned && <Pin size={14} className="text-primary flex-shrink-0 mt-1" />}
          {/* Info — klik untuk detail */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/notes/${note.id}`)}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
              <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                {new Date(note.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border mt-1 inline-block"
              style={{ borderColor: getCategoryColor(note.categoryId), color: getCategoryColor(note.categoryId) }}>
              {getCategoryName(note.categoryId)}
            </span>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">{note.content}</p>
            {note.attachments && note.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                <Paperclip size={11} /> {note.attachments.length} attachment{note.attachments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {/* Tombol edit + delete sejajar horizontal */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={(e) => handleEdit(e, note.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              title="Edit note">
              <Pencil size={14} />
            </button>
            <button onClick={(e) => handleDelete(e, note.id)} disabled={deletingId === note.id}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              title="Delete note">
              {deletingId === note.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><p className="text-red-600 dark:text-red-400">Error: {error}</p></div>;

  return (
    <div className="space-y-6 p-1">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Notes</h1>
          <p className="text-muted-foreground mt-1">Your personal notes</p>
        </div>
        <Button onClick={() => navigate('/notes/new')} className="gap-2">
          <Plus size={18} /> Add Note
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input placeholder="Search by title or content..." value={searchQuery}
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
            <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-foreground">Filter & View</span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button onClick={() => { setFilterCategory('all'); setCurrentPage(1); }} className="text-xs text-primary hover:underline">Reset all</button>
                  )}
                  <button onClick={() => setFilterOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
                  <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {noteCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredNotes.length === 0 && (
        <Card className="border border-border bg-card">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{searchQuery ? 'No notes found' : 'No notes yet'}</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create your first note'}
            </p>
          </CardContent>
        </Card>
      )}

      {pinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Pin size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Pinned ({pinnedNotes.length})</h2>
          </div>
          <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {pinnedNotes.map(note =>
              viewMode === 'card'
                ? <NoteCard key={note.id} note={note} isPinned />
                : <NoteListItem key={note.id} note={note} isPinned />
            )}
          </div>
        </div>
      )}

      {regularNotes.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            All Notes <span className="text-muted-foreground font-normal">({regularNotes.length})</span>
          </h2>
          <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {paginatedNotes.map(note =>
              viewMode === 'card'
                ? <NoteCard key={note.id} note={note} />
                : <NoteListItem key={note.id} note={note} />
            )}
          </div>
        </div>
      )}

      {viewMode === 'card' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, regularNotes.length)} of {regularNotes.length}
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