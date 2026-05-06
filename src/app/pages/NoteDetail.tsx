// src/app/pages/NoteDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { usePendingAttachments } from '../hooks/usePendingAttachments';
import { PendingAttachmentPicker } from '../components/PendingAttachmentPicker';
import { RichTextEditor, stripHtml } from '../components/RichTextEditor';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ChevronLeft, Pin, X, Loader2, FileText,
  Image as ImageIcon, Save,
} from 'lucide-react';
import { CategorySelect } from '../components/CategorySelect';
import { formatFileSize, isImageFile } from '../../lib/supabase';
import { toast } from 'sonner';

const MAX_TITLE   = 100;
const MAX_CONTENT = 10_000;

/* ─── Skeleton ─── */
function NoteDetailSkeleton() {
  return (
    <div className="space-y-4 pb-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-muted rounded-full" />
        <div className="h-6 w-16 bg-muted rounded-full" />
      </div>
      <div className="rounded-xl border-2 border-muted bg-white dark:bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="h-3.5 w-16 bg-muted rounded-full" />
            <div className="h-10 bg-muted rounded-md" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 bg-muted rounded-full" />
            <div className="h-10 bg-muted rounded-md" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-16 bg-muted rounded-full" />
          <div className="h-40 bg-muted rounded-md" />
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-36 bg-muted rounded-full" />
          <div className="h-3 w-40 bg-muted rounded-full" />
        </div>
      </div>
      <div className="rounded-xl border-2 border-muted bg-white dark:bg-card p-4 space-y-3">
        <div className="h-4 w-24 bg-muted rounded-full" />
        <div className="h-10 bg-muted rounded-md" />
        <div className="h-3 w-48 bg-muted rounded-full" />
      </div>
      <div className="h-10 bg-muted rounded-md" />
    </div>
  );
}

/* ─── Main Component ─── */
export function NoteDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const params   = useParams();

  const idFromParams = params.id;
  const idFromUrl    = location.pathname.split('/notes/')[1];
  const id           = idFromParams || idFromUrl;
  const isNew        = id === 'new' || !id;

  const { notes, loading: notesLoading, getNoteById, createNote, updateNote, togglePin } = useNotes();
  const { categories }                                                                    = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments }                           = useAttachments();

  const {
    pendingFiles, addFiles,
    removeFile: removePendingFile,
    uploadAllPending,
    isUploading: isUploadingPending,
  } = usePendingAttachments();

  const note           = isNew ? null : getNoteById(id!);
  const noteCategories = useMemo(
    () => categories.filter(c => c.type === 'note'),
    [categories],
  );

  const [formData, setFormData] = useState({
    title:         '',
    content:       '',
    categoryId:    '',
    subcategoryId: null as string | null,
    pinned:        false,
  });
  const [initialFormData, setInitialFormData] = useState({
    title: '', content: '', categoryId: '', subcategoryId: null as string | null, pinned: false,
  });
  const [attachments, setAttachments]       = useState<any[]>([]);
  const [uploading, setUploading]           = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [togglingPin, setTogglingPin]       = useState(false);
  const [attachsLoading, setAttachsLoading] = useState(false);

  const isBusy = submitting || isUploadingPending;

  const hasChanged = isNew || (
    formData.title         !== initialFormData.title         ||
    formData.content       !== initialFormData.content       ||
    formData.categoryId    !== initialFormData.categoryId    ||
    formData.subcategoryId !== initialFormData.subcategoryId
  );

  // ✅ Char count dari plain text (strip HTML tags)
  const contentLength = stripHtml(formData.content).length;

  useEffect(() => {
    if (!isNew && note) {
      const data = {
        title:         note.title,
        content:       note.content,
        categoryId:    note.categoryId,
        subcategoryId: note.subcategoryId ?? null,
        pinned:        note.pinned,
      };
      setFormData(data);
      setInitialFormData(data);
    }
  }, [isNew, note?.id]);

  useEffect(() => {
    if (!isNew && id) loadAttachments();
  }, [id]);

  const loadAttachments = async () => {
    if (!id) return;
    setAttachsLoading(true);
    const { data } = await getAttachments('note', id);
    if (data) setAttachments(data);
    setAttachsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;
    setUploading(true);
    const uploadToast = toast.loading('Uploading...');
    for (let i = 0; i < files.length; i++) {
      const { success, data, error } = await uploadAttachment(files[i], 'note', id);
      if (success && data) setAttachments(prev => [...prev, data]);
      else toast.error(error || 'Failed to upload file');
    }
    toast.dismiss(uploadToast);
    toast.success('Upload complete');
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string, url: string) => {
    if (!confirm('Remove this attachment?')) return;
    const { success, error } = await deleteAttachment(attachmentId, url);
    if (success) {
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success('Attachment removed');
    } else {
      toast.error(error || 'Failed to delete attachment');
    }
  };

  const handleTogglePin = async () => {
    if (!id || isNew) return;
    setTogglingPin(true);
    const { success, error } = await togglePin(id);
    if (success) {
      const newPinned = !formData.pinned;
      setFormData(prev => ({ ...prev, pinned: newPinned }));
      setInitialFormData(prev => ({ ...prev, pinned: newPinned }));
      toast.success(newPinned ? 'Note pinned!' : 'Note unpinned');
    } else {
      toast.error(error || 'Failed to toggle pin');
    }
    setTogglingPin(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim())          { toast.warning('Please enter a note title.');   return; }
    if (!stripHtml(formData.content))    { toast.warning('Please enter note content.');   return; }
    if (!formData.categoryId)            { toast.warning('Please select a category.');    return; }

    setSubmitting(true);
    try {
      if (isNew) {
        const { success, data, error } = await createNote(formData);
        if (!success || !data) { toast.error(error || 'Failed to create note'); return; }
        if (pendingFiles.length > 0) {
          const { error: uploadError } = await uploadAllPending('note', data.id);
          if (uploadError) toast.warning(`Note saved, but some attachments failed.`);
        }
        toast.success('Note saved!');
        navigate('/notes');
      } else {
        if (!id || id === 'new') { toast.error('Invalid note ID'); return; }
        const { success, error } = await updateNote(id, formData);
        if (success) {
          setInitialFormData({ ...formData });
          toast.success('Note updated!');
        } else {
          toast.error(error || 'Failed to update note');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isNew && notesLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <NoteDetailSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={handleTogglePin}
                disabled={togglingPin}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  formData.pinned
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                {togglingPin
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Pin size={11} />
                }
                {formData.pinned ? 'Pinned' : 'Pin'}
              </button>
            )}
          </div>

          {/* ── Main form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className={`bg-white dark:bg-card shadow-sm rounded-xl border-2 ${
              formData.pinned
                ? 'border-amber-300 dark:border-amber-700'
                : 'border-blue-200 dark:border-blue-900/50'
            }`}>
              <CardContent className="pt-4 pb-4 px-4 space-y-4">

                {/* Title + Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                      <span className={`text-xs ${formData.title.length >= MAX_TITLE ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {formData.title.length}/{MAX_TITLE}
                      </span>
                    </div>
                    <Input
                      id="title"
                      placeholder="Note title..."
                      value={formData.title}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_TITLE)
                          setFormData({ ...formData, title: e.target.value });
                      }}
                      maxLength={MAX_TITLE}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                    <CategorySelect
                      id="category"
                      categories={noteCategories}
                      value={formData.subcategoryId || formData.categoryId}
                      onChange={(categoryId, subcategoryId) =>
                        setFormData(prev => ({ ...prev, categoryId, subcategoryId }))
                      }
                      placeholder="Select category"
                    />
                  </div>
                </div>

                {/* ✅ Rich Text Content */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label>Content <span className="text-destructive">*</span></Label>
                    <span className={`text-xs ${contentLength >= MAX_CONTENT ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {contentLength.toLocaleString('id-ID')}/{MAX_CONTENT.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(html) => {
                      if (stripHtml(html).length <= MAX_CONTENT) {
                        setFormData(prev => ({ ...prev, content: html }));
                      }
                    }}
                    placeholder="Write your note here..."
                    disabled={isBusy}
                    maxLength={MAX_CONTENT}
                    minHeight={200}
                  />
                </div>

                {/* Timestamps */}
                {!isNew && note && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Created: {new Date(note.timestamp).toLocaleDateString('en-US', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                    <span>
                      Updated: {new Date(note.timestamp).toLocaleString('en-US', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

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

            {/* ── Attachments ── */}
            {!isNew && (
              <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
                <CardContent className="pt-4 pb-4 px-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Attachments</p>
                  <div className="space-y-1.5">
                    <Input type="file" accept="image/*,application/pdf" multiple
                      onChange={handleFileUpload} disabled={uploading} />
                    <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, PDF — max 10MB per file</p>
                  </div>
                  {attachsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2].map(i => (
                        <div key={i} className="h-12 bg-muted rounded-lg" />
                      ))}
                    </div>
                  ) : attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isImageFile(file.name)
                              ? <ImageIcon size={16} className="text-primary flex-shrink-0" />
                              : <FileText size={16} className="text-red-500 flex-shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            <a href={file.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex-shrink-0 mr-2">View</a>
                          </div>
                          <Button type="button" variant="ghost" size="icon"
                            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteAttachment(file.id, file.url)}>
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No attachments yet</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Save button ── */}
            <Button
              type="submit"
              className={`w-full gap-2 transition-opacity ${!hasChanged && !isBusy ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={isBusy || !hasChanged}
            >
              {isBusy
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {isUploadingPending ? 'Uploading...' : 'Saving...'}</>
                : <><Save size={15} /> {isNew ? 'Save Note' : 'Update Note'}</>
              }
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}