import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Upload, X, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { formatFileSize, isImageFile } from '../../lib/supabase';

export function TaskDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  
  const { getTaskById, createTask, updateTask, deleteTask, completeTask } = useTasks();
  const { getCategoriesByType } = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();
  
  const task = isNew ? null : getTaskById(id!);
  const taskCategories = getCategoriesByType('task');

  const [formData, setFormData] = useState({
    title: task?.title || '',
    deadline: task?.deadline || new Date().toISOString().split('T')[0],
    categoryId: task?.categoryId || (taskCategories[0]?.id || ''),
    description: task?.description || '',
    completed: task?.completed || false,
  });

  const [completionNote, setCompletionNote] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load attachments if editing
  useEffect(() => {
    if (!isNew && id) {
      loadAttachments();
    }
  }, [id]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        deadline: task.deadline,
        categoryId: task.categoryId,
        description: task.description || '',
        completed: task.completed,
      });
    }
  }, [task]);

  const loadAttachments = async () => {
    if (!id) return;
    const { data } = await getAttachments('task', id);
    if (data) setAttachments(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Mendesak':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'Mendekati':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Masih Lama':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Mendesak': return '🔴';
      case 'Mendekati': return '🟡';
      case 'Masih Lama': return '🟢';
      default: return '⚪';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { success, data, error } = await uploadAttachment(file, 'task', id);
      
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
        const { success, error } = await createTask(formData);
        if (success) {
          navigate('/tasks');
        } else {
          alert(error || 'Gagal membuat tugas');
        }
      } else {
        const { success, error } = await updateTask(id!, formData);
        if (success) {
          navigate('/tasks');
        } else {
          alert(error || 'Gagal update tugas');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    
    setCompleting(true);
    const { success, error } = await completeTask(id, completionNote);
    if (success) {
      navigate('/tasks');
    } else {
      alert(error || 'Gagal menyelesaikan tugas');
      setCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus tugas ini? Semua lampiran juga akan dihapus.')) return;
    
    setDeleting(true);
    const { success, error } = await deleteTask(id!);
    if (success) {
      navigate('/tasks');
    } else {
      alert(error || 'Gagal menghapus tugas');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl dark:text-white">
            {isNew ? 'Tambah Tugas' : task?.completed ? 'Tugas Selesai' : 'Detail Tugas'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isNew ? 'Buat tugas baru dengan deadline' : 'Lihat dan kelola tugas'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Informasi Tugas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title" className="dark:text-gray-300">Judul Tugas</Label>
              <Input
                id="title"
                placeholder="Contoh: Bayar tagihan listrik"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={task?.completed}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="deadline" className="dark:text-gray-300">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                disabled={task?.completed}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="category" className="dark:text-gray-300">Kategori</Label>
              <Select 
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                disabled={task?.completed}
              >
                <SelectTrigger id="category" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isNew && task && (
              <div>
                <Label className="dark:text-gray-300">Status</Label>
                <div className="mt-2">
                  <Badge className={`${getStatusColor(task.status)} text-lg py-2 px-4`}>
                    {getStatusIcon(task.status)} {task.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Status otomatis berdasarkan deadline
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="description" className="dark:text-gray-300">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                placeholder="Tambahkan deskripsi tugas..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                disabled={task?.completed}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Attachments Section */}
        {!isNew && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Lampiran Bukti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="dark:text-gray-300">Upload Bukti (Maksimal 10MB)</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading || task?.completed}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload bukti penyelesaian atau dokumen terkait tugas.
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
                          {!task?.completed && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 ml-2 flex-shrink-0"
                              onClick={() => handleDeleteAttachment(file.id, file.url)}
                            >
                              <X size={16} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isNew && task && !task.completed && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Selesaikan Tugas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="completion-note" className="dark:text-gray-300">Catatan Penyelesaian (Opsional)</Label>
                <Textarea
                  id="completion-note"
                  placeholder="Tambahkan catatan penyelesaian..."
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  rows={3}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <Button 
                type="button"
                onClick={handleComplete}
                disabled={completing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {completing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyelesaikan...
                  </>
                ) : (
                  '✓ Tandai Selesai'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {isNew && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              💡 <strong>Tips:</strong> Simpan tugas terlebih dahulu, lalu Anda bisa menambahkan lampiran.
            </p>
          </div>
        )}

        {task?.completed && (
          <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-2xl">
                  ✓
                </div>
                <div>
                  <p className="text-lg dark:text-white">Tugas Selesai</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tugas ini telah diselesaikan</p>
                  {task.completionNote && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Catatan: {task.completionNote}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          {!task?.completed && (
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                isNew ? 'Simpan Tugas' : 'Update Tugas'
              )}
            </Button>
          )}
          
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
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/tasks')}
          >
            {task?.completed ? 'Kembali' : 'Batal'}
          </Button>
        </div>
      </form>
    </div>
  );
}