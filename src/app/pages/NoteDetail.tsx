import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Pin, Upload, X, Loader2 } from 'lucide-react';

export function NoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  
  const { getNoteById, createNote, updateNote, deleteNote, togglePin } = useNotes();
  const { getCategoriesByType } = useCategories();
  
  const note = isNew ? null : getNoteById(id!);
  const noteCategories = getCategoriesByType('note');

  const [formData, setFormData] = useState({
    title: note?.title || '',
    content: note?.content || '',
    categoryId: note?.categoryId || (noteCategories[0]?.id || ''),
    pinned: note?.pinned || false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pinning, setPinning] = useState(false);

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        content: note.content,
        categoryId: note.categoryId,
        pinned: note.pinned,
      });
    }
  }, [note]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isNew) {
        const { success, error } = await createNote(formData);
        if (success) {
          navigate('/notes');
        } else {
          alert(error || 'Gagal membuat note');
        }
      } else {
        const { success, error } = await updateNote(id!, formData);
        if (success) {
          navigate('/notes');
        } else {
          alert(error || 'Gagal update note');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async () => {
    if (!id) return;
    
    setPinning(true);
    const { success, error } = await togglePin(id);
    if (success) {
      setFormData({ ...formData, pinned: !formData.pinned });
    } else {
      alert(error || 'Gagal toggle pin');
    }
    setPinning(false);
  };

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus note ini?')) return;
    
    setDeleting(true);
    const { success, error } = await deleteNote(id!);
    if (success) {
      navigate('/notes');
    } else {
      alert(error || 'Gagal menghapus note');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/notes')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl dark:text-white">
              {isNew ? 'Tambah Note' : 'Detail Note'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isNew ? 'Buat catatan baru' : 'Lihat dan edit catatan'}
            </p>
          </div>
        </div>
        
        {!isNew && (
          <Button
            variant={formData.pinned ? 'default' : 'outline'}
            onClick={handleTogglePin}
            className="gap-2"
            disabled={pinning}
          >
            {pinning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Pin size={16} />
                {formData.pinned ? 'Unpin' : 'Pin'}
              </>
            )}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Informasi Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title" className="dark:text-gray-300">Judul</Label>
              <Input
                id="title"
                placeholder="Judul catatan..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="category" className="dark:text-gray-300">Kategori</Label>
              <Select 
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger id="category" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {noteCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content" className="dark:text-gray-300">Isi Catatan</Label>
              <Textarea
                id="content"
                placeholder="Tulis catatan Anda di sini..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {!isNew && note && (
              <div>
                <Label className="dark:text-gray-300">Timestamp</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {new Date(note.timestamp).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Lampiran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="dark:text-gray-300">Upload File (Opsional)</Label>
              <div className="mt-2 space-y-2">
                <Button type="button" variant="outline" className="w-full gap-2 dark:bg-gray-700 dark:border-gray-600">
                  <Upload size={16} />
                  Upload Image / PDF
                </Button>
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fitur upload akan diimplementasikan di fase berikutnya
                </p>
                
                {note?.attachments && note.attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {note.attachments.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 flex-1">
                          <Badge variant="outline">{file.type}</Badge>
                          <Input
                            defaultValue={file.name}
                            className="h-8 text-sm dark:bg-gray-600 dark:border-gray-500"
                          />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 ml-2">
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {formData.pinned && (
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Pin size={20} className="text-blue-600" />
                <div>
                  <p className="dark:text-white">Note ini akan muncul di bagian atas daftar</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Catatan terpin juga muncul di Dashboard
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              isNew ? 'Simpan Note' : 'Update Note'
            )}
          </Button>
          
          {!isNew && (
            <Button 
              type="button"
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </Button>
          )}
          
          <Button type="button" variant="outline" onClick={() => navigate('/notes')}>
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}