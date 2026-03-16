// src/app/pages/NoteDetail.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { usePendingAttachments } from '../hooks/usePendingAttachments';
import { PendingAttachmentPicker } from '../components/PendingAttachmentPicker';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  ChevronLeft, Pin, X, Loader2, FileText,
  Image as ImageIcon, Save,
} from 'lucide-react';
import { formatFileSize, isImageFile } from '../../lib/supabase';

const MAX_TITLE   = 100;
const MAX_CONTENT = 10_000;

export function NoteDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const params   = useParams();

  const idFromParams = params.id;
  const idFromUrl    = location.pathname.split('/notes/')[1];
  const id           = idFromParams || idFromUrl;
  const isNew        = id === 'new' || !id;

  const { getNoteById, createNote, updateNote, togglePin } = useNotes();
  const { getCategoriesByType }                 = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();

  const {
    pendingFiles, addFiles,
    removeFile: removePendingFile,
    uploadAllPending,
    isUploading: isUploadingPending,
  } = usePendingAttachments();

  const note           = isNew ? null : getNoteById(id!);
  const noteCategories = getCategoriesByType('note');

  const [formData, setFormData] = useState({
    title:      '',
    content:    '',
    categoryId: '',
    pinned:     false,
  });
  const [initialFormData, setInitialFormData] = useState({
    title: '', content: '', categoryId: '', pinned: false,
  });
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [togglingPin, setTogglingPin] = useState(false);
  const [toast, setToast]             = useState<string | null>(null);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  const isBusy = submitting || isUploadingPending;

  /* ── Has changed — disable save if nothing changed ── */
  const hasChanged = isNew || (
    formData.title      !== initialFormData.title      ||
    formData.content    !== initialFormData.content    ||
    formData.categoryId !== initialFormData.categoryId
  );

  /* ── Auto-resize textarea ── */
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(160, el.scrollHeight)}px`;
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!isNew && note) {
      const data = {
        title:      note.title,
        content:    note.content,
        categoryId: note.categoryId,
        pinned:     note.pinned,
      };
      setFormData(data);
      setInitialFormData(data);
      setTimeout(autoResize, 50);
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

  const handleTogglePin = async () => {
    if (!id || isNew) return;
    setTogglingPin(true);
    const { success, error } = await togglePin(id);
    if (success) {
      const newPinned = !formData.pinned;
      setFormData(prev => ({ ...prev, pinned: newPinned }));
      setInitialFormData(prev => ({ ...prev, pinned: newPinned }));
      showToast(newPinned ? 'Note pinned!' : 'Note unpinned');
    } else alert(error || 'Failed to toggle pin');
    setTogglingPin(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim())   return alert('Please enter a note title.');
    if (!formData.content.trim()) return alert('Please enter note content.');
    if (!formData.categoryId)     return alert('Please select a category.');

    setSubmitting(true);
    try {
      if (isNew) {
        const { success, data, error } = await createNote(formData);
        if (!success || !data) { alert(error || 'Failed to create note'); return; }
        if (pendingFiles.length > 0) {
          const { error: uploadError } = await uploadAllPending('note', data.id);
          if (uploadError) alert(`Note saved, but some attachments failed:\n${uploadError}`);
        }
        showToast('Note saved!');
        setTimeout(() => navigate('/notes'), 800);
      } else {
        if (!id || id === 'new') { alert('Invalid note ID'); return; }
        const { success, error } = await updateNote(id, formData);
        if (success) {
          showToast('Note updated!');
          setTimeout(() => navigate('/notes'), 800);
        } else alert(error || 'Failed to update note');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = noteCategories.find(c => c.id === formData.categoryId);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* ── Toast ── */}
          {toast && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl shadow-lg flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M12.5 3.5L6 10L2.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {toast}
            </div>
          )}

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/notes')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={16} />
              Back to Notes
            </button>
            {/* Pin toggle button */}
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

                {/* Title + Category — side by side */}
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
                    <Select
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                    >
                      <SelectTrigger id="category">
                        {selectedCategory ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCategory.color }} />
                            <span>{selectedCategory.name}</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select category" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {noteCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                              <span>{cat.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="content">Content <span className="text-destructive">*</span></Label>
                    <span className={`text-xs ${formData.content.length >= MAX_CONTENT ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {formData.content.length.toLocaleString('id-ID')}/{MAX_CONTENT.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    id="content"
                    placeholder="Write your note here..."
                    value={formData.content}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_CONTENT) {
                        setFormData({ ...formData, content: e.target.value });
                        autoResize();
                      }
                    }}
                    onInput={autoResize}
                    maxLength={MAX_CONTENT}
                    required
                    className="w-full min-h-[160px] px-3 py-2 text-sm rounded-md border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none overflow-hidden transition-colors"
                    style={{ height: 'auto' }}
                  />
                </div>

                {/* Created + Last updated */}
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

                {/* Pending attachments — new note only */}
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

            {/* ── Attachments — existing note ── */}
            {!isNew && (
              <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
                <CardContent className="pt-4 pb-4 px-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Attachments</p>
                  <div className="space-y-1.5">
                    <Input type="file" accept="image/*,application/pdf" multiple
                      onChange={handleFileUpload} disabled={uploading} />
                    <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, PDF — max 10MB per file</p>
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                      </div>
                    )}
                  </div>
                  {attachments.length > 0 ? (
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
            <Button type="submit" className={`w-full gap-2 transition-opacity ${!hasChanged && !isBusy ? 'opacity-40 cursor-not-allowed' : ''}`} disabled={isBusy || !hasChanged}>
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