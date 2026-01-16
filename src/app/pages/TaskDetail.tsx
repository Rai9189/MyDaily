import { useNavigate, useParams } from 'react-router-dom';
import { dummyTasks } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Upload, X } from 'lucide-react';

export function TaskDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  const task = isNew ? null : dummyTasks.find(t => t.id === id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Mendesak':
        return 'bg-red-100 text-red-700';
      case 'Mendekati':
        return 'bg-yellow-100 text-yellow-700';
      case 'Masih Lama':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Mendesak':
        return '🔴';
      case 'Mendekati':
        return '🟡';
      case 'Masih Lama':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl">
            {isNew ? 'Tambah Tugas' : task?.completed ? 'Selesaikan Tugas' : 'Detail Tugas'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isNew ? 'Buat tugas baru dengan deadline' : 'Lihat dan kelola tugas'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Tugas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Judul Tugas</Label>
            <Input
              id="title"
              placeholder="Contoh: Bayar tagihan listrik"
              defaultValue={task?.title || ''}
              disabled={task?.completed}
            />
          </div>

          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              defaultValue={task?.deadline || ''}
              disabled={task?.completed}
            />
          </div>

          {!isNew && task && (
            <div>
              <Label>Status</Label>
              <div className="mt-2">
                <Badge className={`${getStatusColor(task.status)} text-lg py-2 px-4`}>
                  {getStatusIcon(task.status)} {task.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Status otomatis berdasarkan deadline
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="description">Deskripsi (Opsional)</Label>
            <Textarea
              id="description"
              placeholder="Tambahkan deskripsi tugas..."
              defaultValue={task?.description || ''}
              rows={3}
              disabled={task?.completed}
            />
          </div>
        </CardContent>
      </Card>

      {!isNew && task && !task.completed && (
        <Card>
          <CardHeader>
            <CardTitle>Selesaikan Tugas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="completion-note">Catatan Penyelesaian (Opsional)</Label>
              <Textarea
                id="completion-note"
                placeholder="Tambahkan catatan penyelesaian..."
                rows={3}
              />
            </div>

            <div>
              <Label>Upload Bukti (Opsional)</Label>
              <div className="mt-2 space-y-2">
                <Button variant="outline" className="w-full gap-2">
                  <Upload size={16} />
                  Upload Image / PDF
                </Button>
                
                {task.completionAttachments && task.completionAttachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {task.completionAttachments.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{file.type}</Badge>
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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

      {task?.completed && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                ✓
              </div>
              <div>
                <p className="text-lg">Tugas Selesai</p>
                <p className="text-sm text-gray-600">Tugas ini telah diselesaikan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        {!task?.completed && (
          <Button className="flex-1">
            {isNew ? 'Simpan Tugas' : 'Tandai Selesai'}
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate('/tasks')}>
          {task?.completed ? 'Kembali' : 'Batal'}
        </Button>
      </div>
    </div>
  );
}
