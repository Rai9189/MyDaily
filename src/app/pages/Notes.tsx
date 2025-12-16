import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dummyNotes } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Search, Pin, Paperclip } from 'lucide-react';
import { Note } from '../types';

export function Notes() {
  const navigate = useNavigate();
  const [notes] = useState<Note[]>(dummyNotes);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const regularNotes = filteredNotes.filter(n => !n.pinned);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl">Notes</h1>
          <p className="text-gray-500 mt-1">Simpan catatan pribadi Anda</p>
        </div>
        <Button onClick={() => navigate('/notes/new')} className="gap-2">
          <Plus size={20} />
          Tambah Note
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Cari notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Pin size={20} className="text-blue-600" />
            <h2 className="text-xl">Catatan Terpin ({pinnedNotes.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note) => (
              <Card
                key={note.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200"
                onClick={() => navigate(`/notes/${note.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="line-clamp-1">{note.title}</span>
                    <Pin size={16} className="text-blue-600 flex-shrink-0 ml-2" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
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
            ))}
          </div>
        </div>
      )}

      {/* Regular Notes */}
      {regularNotes.length > 0 && (
        <div>
          <h2 className="text-xl mb-4">
            Semua Catatan ({regularNotes.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularNotes.map((note) => (
              <Card
                key={note.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/notes/${note.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-base line-clamp-1">
                    {note.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
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
            ))}
          </div>
        </div>
      )}

      {filteredNotes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <p>{searchQuery ? 'Tidak ada catatan ditemukan' : 'Belum ada catatan'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
