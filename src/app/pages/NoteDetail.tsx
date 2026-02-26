import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { usePendingAttachments } from '../hooks/usePendingAttachments';
import { PendingAttachmentPicker } from '../components/PendingAttachmentPicker';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Pin, X, Loader2, FileText, Image as ImageIcon, Save } from 'lucide-react';
import { formatFileSize, isImageFile } from '../../lib/supabase';

export function NoteDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const idFromParams = params.id;
  const idFromUrl = location.pathname.split('/notes/')[1];
  const id = idFromParams || idFromUrl;
  const isNew = id === 'new' || !id;

  const { getNoteById, createNote, updateNote, togglePin } = useNotes();
  const { getCategoriesByType } = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();

  const {
    pendingFiles,
    addFiles,
    removeFile: removePendingFile,
    uploadAllPending,
    isUploading: isUploadingPending,
  } = usePendingAttachments();

  const note = isNew ? null : getNoteById(id!);
  const noteCategories = getCategoriesByType('note');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
    pinned: false,
  });

  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pinning, setPinning] = useState(false);

  const isBusy = submitting || isUploadingPending;

  useEffect(() => {
    if (isNew) {
      setFormData(prev => ({
        ...prev,
        categoryId: prev.categoryId || noteCategories[0]?.id || '',
      }));
    }
  }, [noteCategories.length, isNew]);

  useEffect(() => {
    if (!isNew && note) {
      setFormData({
        title: note.title,
        content: note.content,
        categoryId: note.categoryId,
        pinned: note.pinned,
      });
    }
  }, [isNew, note?.id]);

  useEffect(() => {
    if (!isNew && id) loadAttachments();
  }, [id]);

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
      const { success, data, error } = await uploadAttachment(files[i], 'note', id);
      if (success && data) setAttachments(prev => [...prev, data]);
      else alert(error || 'Failed to upload file');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string, url: string) => {
    if (!confirm('Remove this attachment?')) return;
    const { success, error } = await deleteAttachment(attachmentId, url);
    if (success) setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    else alert(error || 'Failed to delete attachment');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert('Please enter a note title');
    if (!formData.content.trim()) return alert('Please enter note content');
    if (!formData.categoryId) return alert('Please select a category');

    setSubmitting(true);
    try {
      if (isNew) {
        // ✅ Create note dulu → dapat ID → upload pending files
        const { success, data, error } = await createNote(formData);
        if (!success || !data) { alert(error || 'Failed to create note'); return; }
        if (pendingFiles.length > 0) {
          const { error: uploadError } = await uploadAllPending('note', data.id);
          if (uploadError) alert(`Note saved, but some attachments failed:\n${uploadError}`);
        }
        navigate('/notes');
      } else {
        if (!id || id === 'new') { alert('Invalid note ID'); return; }
        const { success, error } = await updateNote(id, formData);
        if (success) navigate('/notes');
        else alert(error || 'Failed to update note');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async () => {
    if (!id) return;
    setPinning(true);
    const { success, error } = await togglePin(id);
    if (success) setFormData(prev => ({ ...prev, pinned: !prev.pinned }));
    else alert(error || 'Failed to toggle pin');
    setPinning(false);
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/notes')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              {isNew ? 'New Note' : 'Note Detail'}
            </h1>
            <p className="text-muted-foreground mt-0.5">
              {isNew ? 'Create a new note' : 'View and edit this note'}
            </p>
          </div>
        </div>
        {!isNew && (
          <Button variant={formData.pinned ? 'default' : 'outline'} onClick={handleTogglePin} disabled={pinning} className="gap-2">
            {pinning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pin size={15} />}
            {formData.pinned ? 'Unpin' : 'Pin'}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Note Info</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Note title..." value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {noteCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" placeholder="Write your note here..." value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={10} required />
            </div>

            {!isNew && note && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Last updated</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(note.timestamp).toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            {/* ✅ Attachment picker saat create baru */}
            {isNew && (
              <PendingAttachmentPicker
                pendingFiles={pendingFiles}
                onAddFiles={addFiles}
                onRemoveFile={removePendingFile}
                isUploading={isUploadingPending}
                disabled={isBusy}
              />
            )}
          </CardContent>
        </Card>

        {/* Attachments (edit mode) */}
        {!isNew && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Upload File <span className="text-muted-foreground font-normal">(Max 10MB)</span></Label>
                <Input type="file" accept="image/*,application/pdf" multiple onChange={handleFileUpload} disabled={uploading} />
                <p className="text-xs text-muted-foreground">Supported: JPEG, PNG, GIF, WebP, PDF — max 10MB per file</p>
                {uploading && <div className="flex items-center gap-2 text-sm text-primary"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>}
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isImageFile(file.name) ? <ImageIcon size={18} className="text-primary flex-shrink-0" /> : <FileText size={18} className="text-red-500 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-shrink-0 mr-2">View</a>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteAttachment(file.id, file.url)}>
                        <X size={15} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {formData.pinned && (
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <Pin size={16} className="text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">This note is pinned</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pinned notes appear at the top of your list and on the Dashboard</p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" className="w-full gap-2" disabled={isBusy}>
            {isBusy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {isUploadingPending ? 'Uploading...' : 'Saving...'}</>
              : <><Save size={16} />{isNew ? 'Save Note' : 'Update Note'}</>
            }
          </Button>
        </div>
      </form>
    </div>
  );
}