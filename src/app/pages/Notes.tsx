import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Pin, Paperclip, List, LayoutGrid, ChevronLeft, ChevronRight, Edit, Filter, Loader2 } from 'lucide-react';

export function Notes() {
  const navigate = useNavigate();
  const { notes, loading, error } = useNotes();
  const { getCategoriesByType } = useCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const noteCategories = getCategoriesByType('note');

  const getCategoryName = (categoryId: string) => {
    return noteCategories.find(c => c.id === categoryId)?.name || 'Lainnya';
  };

  const getCategoryColor = (categoryId: string) => {
    return noteCategories.find(c => c.id === categoryId)?.color || '#gray';
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(note => {
        const matchesTitle = note.title.toLowerCase().includes(query);
        const matchesContent = note.content.toLowerCase().includes(query);
        return matchesTitle || matchesContent;
      });
    }

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter(note => note.categoryId === filterCategory);
    }

    return result;
  }, [notes, searchQuery, filterCategory]);

  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.pinned), [filteredNotes]);
  const regularNotes = useMemo(() => filteredNotes.filter(n => !n.pinned), [filteredNotes]);

  // Pagination for regular notes
  const totalPages = Math.ceil(regularNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotes = viewMode === 'list' ? regularNotes : regularNotes.slice(startIndex, endIndex);

  const handleFilterChange = (value: string) => {
    setFilterCategory(value);
    setCurrentPage(1);
  };

  const NoteCard = ({ note, isPinned }: { note: any, isPinned?: boolean }) => (
    <Card
      className={`hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700 ${isPinned ? 'border-blue-200 dark:border-blue-700' : ''}`}
    >
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="line-clamp-1 flex-1 cursor-pointer dark:text-white" onClick={() => navigate(`/notes/${note.id}`)}>
            {note.title}
          </span>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {isPinned && <Pin size={16} className="text-blue-600" />}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/notes/${note.id}`);
              }}
            >
              <Edit size={16} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent onClick={() => navigate(`/notes/${note.id}`)} className="cursor-pointer">
        <div className="mb-3">
          <Badge
            variant="outline"
            style={{
              borderColor: getCategoryColor(note.categoryId),
              color: getCategoryColor(note.categoryId)
            }}
          >
            {getCategoryName(note.categoryId)}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
          {note.content}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>
            {new Date(note.timestamp).toLocaleDateString('id-ID')}
          </span>
          {note.attachments && note.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip size={12} />
              <span>{note.attachments.length}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const NoteListItem = ({ note, isPinned }: { note: any, isPinned?: boolean }) => (
    <Card className={`hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700 ${isPinned ? 'border-blue-200 dark:border-blue-700' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 cursor-pointer" onClick={() => navigate(`/notes/${note.id}`)}>
            <div className="flex items-center gap-2 mb-2">
              {isPinned && <Pin size={16} className="text-blue-600" />}
              <h3 className="text-lg dark:text-white">{note.title}</h3>
            </div>
            <div className="mb-2">
              <Badge
                variant="outline"
                style={{
                  borderColor: getCategoryColor(note.categoryId),
                  color: getCategoryColor(note.categoryId)
                }}
              >
                {getCategoryName(note.categoryId)}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {note.content}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              <span>{new Date(note.timestamp).toLocaleDateString('id-ID')}</span>
              {note.attachments && note.attachments.length > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip size={12} />
                  <span>{note.attachments.length} lampiran</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 dark:border-gray-600"
            onClick={() => navigate(`/notes/${note.id}`)}
          >
            <Edit size={14} />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
          <h1 className="text-3xl dark:text-white">Notes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Simpan catatan pribadi Anda</p>
        </div>
        <Button onClick={() => navigate('/notes/new')} className="gap-2">
          <Plus size={20} />
          Tambah Note
        </Button>
      </div>

      {/* Search Bar and Filter */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Cari notes (judul, konten)..."
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
                  <SheetTitle className="dark:text-white">Filter & Tampilan</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Filter Kategori</label>
                    <Select value={filterCategory} onValueChange={handleFilterChange}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectValue placeholder="Semua Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        {noteCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View Options */}
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
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
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

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Pin size={20} className="text-blue-600" />
            <h2 className="text-xl dark:text-white">Catatan Terpin ({pinnedNotes.length})</h2>
          </div>
          <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {pinnedNotes.map((note) => (
              viewMode === 'card' ? (
                <NoteCard key={note.id} note={note} isPinned />
              ) : (
                <NoteListItem key={note.id} note={note} isPinned />
              )
            ))}
          </div>
        </div>
      )}

      {/* Regular Notes */}
      {regularNotes.length > 0 && (
        <div>
          <h2 className="text-xl mb-4 dark:text-white">
            Semua Catatan ({regularNotes.length})
          </h2>
          <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {paginatedNotes.map((note) => (
              viewMode === 'card' ? (
                <NoteCard key={note.id} note={note} />
              ) : (
                <NoteListItem key={note.id} note={note} />
              )
            ))}
          </div>
        </div>
      )}

      {filteredNotes.length === 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12 text-center text-gray-500 dark:text-gray-400">
            <p>{searchQuery ? 'Tidak ada catatan ditemukan' : 'Belum ada catatan'}</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {viewMode === 'card' && totalPages > 1 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, regularNotes.length)} dari {regularNotes.length} catatan
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