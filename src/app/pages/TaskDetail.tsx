import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
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
import { ArrowLeft, X, Loader2, FileText, Image as ImageIcon, Save, CheckCircle2, CalendarX, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { formatFileSize, isImageFile } from '../../lib/supabase';

const MAX_TITLE = 100;
const MAX_DESC = 10_000;

export function TaskDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const idFromParams = params.id;
  const idFromUrl = location.pathname.split('/tasks/')[1];
  const id = idFromParams || idFromUrl;
  const isNew = id === 'new' || !id;

  const { getTaskById, createTask, updateTask, completeTask } = useTasks();
  const { getCategoriesByType } = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();

  const {
    pendingFiles,
    addFiles,
    removeFile: removePendingFile,
    uploadAllPending,
    isUploading: isUploadingPending,
  } = usePendingAttachments();

  const task = isNew ? null : getTaskById(id!);
  const taskCategories = getCategoriesByType('task');

  const [formData, setFormData] = useState({
    title: '',
    deadline: new Date().toISOString().split('T')[0],
    categoryId: '',
    description: '',
    completed: false,
  });

  const [completionNote, setCompletionNote] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const isBusy = submitting || isUploadingPending;

  useEffect(() => {
    if (!isNew && task) {
      setFormData({
        title: task.title,
        deadline: task.deadline,
        categoryId: task.categoryId,
        description: task.description || '',
        completed: task.completed,
      });
    }
  }, [isNew, task?.id]);

  useEffect(() => {
    if (!isNew && id) loadAttachments();
  }, [id]);

  const loadAttachments = async () => {
    if (!id) return;
    const { data } = await getAttachments('task', id);
    if (data) setAttachments(data);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Mendesak': return 'Urgent';
      case 'Mendekati': return 'Upcoming';
      case 'Masih Lama': return 'On Track';
      default: return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'overdue':  return 'destructive';
      case 'urgent':   return 'destructive';
      case 'upcoming': return 'default';
      default:         return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':  return <CalendarX size={13} />;
      case 'urgent':   return <AlertCircle size={13} />;
      case 'upcoming': return <Clock size={13} />;
      case 'on_track': return <CheckCircle2 size={13} />;
      default:         return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Mendesak': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'Mendekati': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'Masih Lama': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const { success, data, error } = await uploadAttachment(files[i], 'task', id);
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
    if (!formData.title.trim()) return alert('Please enter a task title.');
    if (!formData.categoryId) return alert('Please select a category.');

    setSubmitting(true);
    try {
      if (isNew) {
        const { success, data, error } = await createTask(formData);
        if (!success || !data) { alert(error || 'Failed to create task'); return; }
        if (pendingFiles.length > 0) {
          const { error: uploadError } = await uploadAllPending('task', data.id);
          if (uploadError) alert(`Task saved, but some attachments failed:\n${uploadError}`);
        }
        navigate('/tasks');
      } else {
        if (!id || id === 'new') { alert('Invalid task ID'); return; }
        const { success, error } = await updateTask(id, formData);
        if (success) navigate('/tasks');
        else alert(error || 'Failed to update task');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    const { success, error } = await completeTask(id, completionNote);
    if (success) navigate('/tasks');
    else { alert(error || 'Failed to complete task'); setCompleting(false); }
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            {isNew ? 'New Task' : task?.completed ? 'Completed Task' : 'Task Detail'}
          </h1>
          <p className="text-muted-foreground mt-0.5">
            {isNew ? 'Create a new task with a deadline' : 'View and manage this task'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Task Info</CardTitle>
              {!isNew && task && (
                task.completed ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CheckCircle2 size={11} /> Completed
                  </Badge>
                ) : (
                  <Badge variant={getStatusVariant(task.status) as any} className="gap-1 text-xs">
                    {getStatusIcon(task.status)}{getStatusLabel(task.status)}
                  </Badge>
                )
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">

            {/* Title — max 100 char */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="title">Task Title</Label>
                <span className={`text-xs ${formData.title.length >= MAX_TITLE ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {formData.title.length}/{MAX_TITLE}
                </span>
              </div>
              <Input
                id="title"
                placeholder="e.g. Pay electricity bill"
                value={formData.title}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_TITLE)
                    setFormData({ ...formData, title: e.target.value });
                }}
                maxLength={MAX_TITLE}
                disabled={task?.completed}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                disabled={task?.completed} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
              <Select
                value={formData.categoryId}
                onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                disabled={task?.completed}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {taskCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description — max 10.000 char */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">
                  Description <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <span className={`text-xs ${formData.description.length >= MAX_DESC ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {formData.description.length.toLocaleString('id-ID')}/{MAX_DESC.toLocaleString('id-ID')}
                </span>
              </div>
              <Textarea
                id="description"
                placeholder="Add details about this task..."
                value={formData.description}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DESC)
                    setFormData({ ...formData, description: e.target.value });
                }}
                maxLength={MAX_DESC}
                rows={3}
                disabled={task?.completed}
              />
            </div>

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
                <Label>Upload Evidence <span className="text-muted-foreground font-normal">(Max 10MB)</span></Label>
                <Input type="file" accept="image/*,application/pdf" multiple onChange={handleFileUpload} disabled={uploading || task?.completed} />
                <p className="text-xs text-muted-foreground">Upload proof of completion or related documents</p>
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
                      {!task?.completed && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteAttachment(file.id, file.url)}>
                          <X size={15} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mark as Complete */}
        {!isNew && task && !task.completed && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Mark as Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="completion-note">Completion Note <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Textarea id="completion-note" placeholder="Add a note about how this was completed..." value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} rows={3} />
              </div>
              <Button type="button" onClick={handleComplete} disabled={completing} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                {completing ? <><Loader2 className="w-4 h-4 animate-spin" /> Completing...</> : <><CheckCircle2 size={16} /> Mark as Complete</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {task?.completed && (
          <Card className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">Task Completed</p>
                  {task.completionNote && <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">Note: {task.completionNote}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!task?.completed && (
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" className="flex-1 gap-2" disabled={isBusy}>
              {isBusy
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {isUploadingPending ? 'Uploading...' : 'Saving...'}</>
                : <><Save size={16} />{isNew ? 'Save Task' : 'Update Task'}</>
              }
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}