import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Pin, Upload, X, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { formatFileSize, isImageFile } from '../../lib/supabase';

export function NoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  
  const { getNoteById, createNote, updateNote, deleteNote, togglePin } = useNotes();
  const { getCategoriesByType } = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();
  
  const note = isNew ? null : getNoteById(id!);
  const noteCategories = getCategoriesByType('note');

  const [formData, setFormData] = useState({
    title: note?.title || '',
    content: note?.content || '',
    categoryId: note?.categoryId || (noteCategories[0]?.id || ''),
    pinned: note?.pinned || false,
  });

  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pinning, setPinning] = useState(false);

  // Load attachments if editing
  useEffect(() => {
    if (!isNew && id) {
      loadAttachments();
    }
  }, [id]);

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

  const loadAttachments = async () => {
    if (!id) return;
    const { data } = await getAttachments('note', id);
    if (data) setAttachments(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { success, data, error } = await uploadAttachment(file, 'note', id);
      
      if (success && data) {
        setAttachments(prev => [...prev, data]);
      } else {
        alert(error || 'Gagal upload file');
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string, url: string) => {
    if (!confirm('Hapus lampiran ini?')) return;

    const { success, error } = await deleteAttachment(attachmentId, url);
    if (success) {
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } else {
      alert(error || 'Gagal menghapus lampiran');
    }
  };

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
    if (!confirm('Yakin ingin menghapus note ini? Semua lampiran juga akan dihapus.')) return;
    
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

        {/* Attachments Section */}
        {!isNew && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Lampiran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="dark:text-gray-300">Upload File (Maksimal 10MB)</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tambahkan gambar atau dokumen PDF sebagai lampiran catatan.
                  </p>
                  
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengupload...
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {attachments.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isImageFile(file.name) ? (
                              <ImageIcon size={20} className="text-blue-600 flex-shrink-0" />
                            ) : (
                              <FileText size={20} className="text-red-600 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate dark:text-white">{file.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex-shrink-0"
                            >
                              Lihat
                            </a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2 flex-shrink-0"
                            onClick={() => handleDeleteAttachment(file.id, file.url)}
                          >
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
        )}

        {isNew && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              💡 <strong>Tips:</strong> Simpan note terlebih dahulu, lalu Anda bisa menambahkan lampiran.
            </p>
          </div>
        )}

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