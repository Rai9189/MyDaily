// src/app/pages/TaskDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { usePendingAttachments } from '../hooks/usePendingAttachments';
import { PendingAttachmentPicker } from '../components/PendingAttachmentPicker';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  ChevronLeft, X, Loader2, FileText, Image as ImageIcon,
  Save, CheckCircle2, CalendarX, AlertCircle, Clock, RotateCcw,
} from 'lucide-react';
import { CategorySelect } from '../components/CategorySelect';
import { formatFileSize, isImageFile } from '../../lib/supabase';
import { toast } from 'sonner';
import { DetailPageSkeleton } from '../components/Skeletons';

const MAX_TITLE = 100;
const MAX_DESC  = 10_000;

/* ─── Reusable Popup ─── */
function ConfirmPopup({
  icon, iconBg, title, description, cancelLabel,
  confirmLabel, confirmClassName, onConfirm, onCancel, loading,
}: {
  icon: React.ReactNode; iconBg: string; title: string; description: string;
  cancelLabel?: string; confirmLabel: string; confirmClassName: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xs bg-white dark:bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>{icon}</div>
            <button type="button" onClick={onCancel} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            {cancelLabel ?? 'Cancel'}
          </Button>
          <Button type="button" className={`flex-1 gap-2 ${confirmClassName}`} onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function TaskDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const params   = useParams();

  const idFromParams = params.id;
  const idFromUrl    = location.pathname.split('/tasks/')[1];
  const id           = idFromParams || idFromUrl;
  const isNew        = id === 'new' || !id;

  const { tasks, loading: tasksLoading, getTaskById, createTask, updateTask, completeTask, uncompleteTask } = useTasks();
  const { categories } = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();
  const { pendingFiles, addFiles, removeFile: removePendingFile, uploadAllPending, isUploading: isUploadingPending } = usePendingAttachments();

  const task           = isNew ? null : getTaskById(id!);
  const taskCategories = useMemo(() => categories.filter(c => c.type === 'task'), [categories]);

  const [formData, setFormData] = useState({
    title: '', deadline: new Date().toISOString().split('T')[0],
    categoryId: '', subcategoryId: null as string | null, description: '', completed: false,
  });
  const [completionNote, setCompletionNote]       = useState('');
  const [attachments, setAttachments]             = useState<any[]>([]);
  const [attachsLoading, setAttachsLoading]       = useState(false);
  const [uploading, setUploading]                 = useState(false);
  const [submitting, setSubmitting]               = useState(false);
  const [completing, setCompleting]               = useState(false);
  const [uncompleting, setUncompleting]           = useState(false);
  const [showNoAttachPopup, setShowNoAttachPopup] = useState(false);
  const [showUnsubmitPopup, setShowUnsubmitPopup] = useState(false);

  const isBusy = submitting || isUploadingPending;

  const getDaysInfo = (deadline: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due   = new Date(deadline); due.setHours(0, 0, 0, 0);
    const days  = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const dayName = due.toLocaleDateString('en-US', { weekday: 'long' });
    const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days} days left`;
    const color = days < 0 ? 'text-red-600 dark:text-red-400' : days <= 1 ? 'text-orange-600 dark:text-orange-400' : days <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground';
    return { days, dayName, label, color };
  };

  useEffect(() => {
    if (!isNew && task) {
      setFormData({
        title: task.title, deadline: task.deadline, categoryId: task.categoryId,
        subcategoryId: task.subcategoryId ?? null, description: task.description || '', completed: task.completed,
      });
      setCompletionNote(task.completionNote || '');
    }
  }, [isNew, task?.id]);

  useEffect(() => {
    if (!isNew && id) loadAttachments();
  }, [id]);

  const loadAttachments = async () => {
    if (!id) return;
    setAttachsLoading(true);
    const { data } = await getAttachments('task', id);
    if (data) setAttachments(data);
    setAttachsLoading(false);
  };

  const statusBadge = (status: string) => {
    const configs: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      overdue:  { label: 'Overdue',  icon: <CalendarX size={12} />,    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
      urgent:   { label: 'Urgent',   icon: <AlertCircle size={12} />,  className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
      upcoming: { label: 'Upcoming', icon: <Clock size={12} />,        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
      on_track: { label: 'On Track', icon: <CheckCircle2 size={12} />, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
    };
    const cfg = configs[status];
    if (!cfg) return null;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.className}`}>
        {cfg.icon}{cfg.label}
      </span>
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;
    setUploading(true);
    const loadingToast = toast.loading('Uploading...');
    for (let i = 0; i < files.length; i++) {
      const { success, data, error } = await uploadAttachment(files[i], 'task', id);
      if (success && data) setAttachments(prev => [...prev, data]);
      else toast.error(error || 'Failed to upload file');
    }
    toast.dismiss(loadingToast);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.warning('Please enter a task title.'); return; }
    if (!formData.categoryId)   { toast.warning('Please select a category.'); return; }
    setSubmitting(true);
    try {
      if (isNew) {
        const { success, data, error } = await createTask(formData);
        if (!success || !data) { toast.error(error || 'Failed to create task'); return; }
        if (pendingFiles.length > 0) {
          const { error: uploadError } = await uploadAllPending('task', data.id);
          if (uploadError) toast.warning('Task saved, but some attachments failed.');
        }
        toast.success('Task saved!');
        navigate('/tasks');
      } else {
        if (!id || id === 'new') { toast.error('Invalid task ID'); return; }
        const { success, error } = await updateTask(id, formData);
        if (success) toast.success('Task updated!');
        else toast.error(error || 'Failed to update task');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkDonePress = () => {
    if (attachments.length > 0) doComplete();
    else setShowNoAttachPopup(true);
  };

  const doComplete = async () => {
    if (!id) return;
    setShowNoAttachPopup(false);
    setCompleting(true);
    const { success, error } = await completeTask(id, completionNote);
    if (success) toast.success('Task completed!');
    else toast.error(error || 'Failed to complete task');
    setCompleting(false);
  };

  const doUncomplete = async () => {
    if (!id) return;
    setShowUnsubmitPopup(false);
    setUncompleting(true);
    const { success, error } = await uncompleteTask(id);
    if (success) toast.success('Task reopened!');
    else toast.error(error || 'Failed to reopen task');
    setUncompleting(false);
  };

  // Loading skeleton
  if (!isNew && tasksLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <DetailPageSkeleton fields={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {showNoAttachPopup && (
        <ConfirmPopup
          icon={<AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          title="No attachment"
          description="You haven't attached any files to this task. Are you sure you want to mark it as complete?"
          confirmLabel="Mark as Done"
          confirmClassName="bg-green-600 hover:bg-green-700 text-white"
          onConfirm={doComplete}
          onCancel={() => setShowNoAttachPopup(false)}
          loading={completing}
        />
      )}
      {showUnsubmitPopup && (
        <ConfirmPopup
          icon={<RotateCcw size={20} className="text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          title="Unsubmit task?"
          description="This will reopen the task and mark it as incomplete. You can complete it again later."
          confirmLabel="Unsubmit"
          confirmClassName="bg-amber-500 hover:bg-amber-600 text-white"
          onConfirm={doUncomplete}
          onCancel={() => setShowUnsubmitPopup(false)}
          loading={uncompleting}
        />
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/tasks')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} /> Back to Tasks
            </button>
            {!isNew && task && (
              task.completed
                ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                    <CheckCircle2 size={12} /> Completed
                  </span>
                : statusBadge(task.status)
            )}
          </div>

          {/* Completed banner */}
          {task?.completed && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Task Completed</p>
                {task.completionNote && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 truncate">Note: {task.completionNote}</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className={`bg-white dark:bg-card shadow-sm rounded-xl border-2 ${
              task?.completed ? 'border-green-200 dark:border-green-900/50'
              : task?.status === 'overdue'  ? 'border-red-300 dark:border-red-800'
              : task?.status === 'urgent'   ? 'border-orange-300 dark:border-orange-800'
              : task?.status === 'upcoming' ? 'border-amber-200 dark:border-amber-800'
              : 'border-blue-200 dark:border-blue-900/50'
            }`}>
              <CardContent className="pt-4 pb-4 px-4 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="title">Task Title <span className="text-destructive">*</span></Label>
                    <span className={`text-xs ${formData.title.length >= MAX_TITLE ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {formData.title.length}/{MAX_TITLE}
                    </span>
                  </div>
                  <Input id="title" placeholder="e.g. Pay electricity bill" value={formData.title}
                    onChange={(e) => { if (e.target.value.length <= MAX_TITLE) setFormData({ ...formData, title: e.target.value }); }}
                    maxLength={MAX_TITLE} disabled={task?.completed} required />
                </div>

                {/* Deadline + Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="deadline">Deadline <span className="text-destructive">*</span></Label>
                    <Input id="deadline" type="date" value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      disabled={task?.completed} required />
                    {formData.deadline && (
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-muted-foreground">{getDaysInfo(formData.deadline).dayName}</span>
                        {!task?.completed && (
                          <span className={`text-xs font-medium ${getDaysInfo(formData.deadline).color}`}>
                            {getDaysInfo(formData.deadline).label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                    <CategorySelect id="category" categories={taskCategories}
                      value={formData.subcategoryId || formData.categoryId}
                      onChange={(categoryId, subcategoryId) => setFormData(prev => ({ ...prev, categoryId, subcategoryId }))}
                      placeholder="Select category" disabled={task?.completed} />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description">Description <span className="text-muted-foreground font-normal text-xs">(Optional)</span></Label>
                    <span className={`text-xs ${formData.description.length >= MAX_DESC ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {formData.description.length.toLocaleString('id-ID')}/{MAX_DESC.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <Textarea id="description" placeholder="Add details about this task..." value={formData.description}
                    onChange={(e) => { if (e.target.value.length <= MAX_DESC) setFormData({ ...formData, description: e.target.value }); }}
                    maxLength={MAX_DESC} rows={3} disabled={task?.completed} />
                </div>

                {isNew && (
                  <PendingAttachmentPicker pendingFiles={pendingFiles} onAddFiles={addFiles}
                    onRemoveFile={removePendingFile} isUploading={isUploadingPending} disabled={isBusy} />
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            {!isNew && (
              <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
                <CardContent className="pt-4 pb-4 px-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Attachments</p>
                  {!task?.completed && (
                    <div className="space-y-1.5">
                      <Input type="file" accept="image/*,application/pdf" multiple onChange={handleFileUpload} disabled={uploading} />
                      <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, PDF — max 10MB per file</p>
                    </div>
                  )}
                  {attachsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded-lg" />)}
                    </div>
                  ) : attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isImageFile(file.name) ? <ImageIcon size={16} className="text-primary flex-shrink-0" /> : <FileText size={16} className="text-red-500 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-shrink-0 mr-2">View</a>
                          </div>
                          {!task?.completed && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAttachment(file.id, file.url)}>
                              <X size={14} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No attachments yet</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action card */}
            {!isNew && task && (
              <Card className={`bg-white dark:bg-card border-2 shadow-sm rounded-xl ${
                task.completed ? 'border-green-200 dark:border-green-900/50'
                : task.status === 'overdue' ? 'border-red-300 dark:border-red-800'
                : 'border-green-200 dark:border-green-900/50'
              }`}>
                <CardContent className="pt-4 pb-4 px-4 space-y-3">
                  {!task.completed && task.status === 'overdue' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                      <CalendarX size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-300 font-medium">This task is overdue — complete it as soon as possible.</p>
                    </div>
                  )}
                  {!task.completed && task.status === 'urgent' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800">
                      <AlertCircle size={14} className="text-orange-600 dark:text-orange-400 flex-shrink-0" />
                      <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">Deadline is approaching — complete this task soon.</p>
                    </div>
                  )}
                  {!task.completed && (
                    <div className="space-y-1.5">
                      <Label htmlFor="completion-note">Completion Note <span className="text-muted-foreground font-normal text-xs">(Optional)</span></Label>
                      <Textarea id="completion-note" placeholder="Add a note about how this was completed..."
                        value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} rows={2} />
                    </div>
                  )}
                  {!task.completed && (
                    <Button type="button" onClick={handleMarkDonePress} disabled={completing}
                      className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                      {completing ? <><Loader2 size={15} className="animate-spin" /> Completing…</> : <><CheckCircle2 size={15} /> Mark as Done</>}
                    </Button>
                  )}
                  {task.completed && (
                    <Button type="button" variant="outline" onClick={() => setShowUnsubmitPopup(true)} disabled={uncompleting} className="w-full gap-2">
                      {uncompleting ? <><Loader2 size={15} className="animate-spin" /> Reopening…</> : <><RotateCcw size={15} /> Unsubmit</>}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Save button */}
            {!task?.completed && (
              <Button type="submit" className="w-full gap-2" disabled={isBusy}>
                {isBusy
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {isUploadingPending ? 'Uploading...' : 'Saving...'}</>
                  : <><Save size={15} /> {isNew ? 'Save Task' : 'Update Task'}</>
                }
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}