import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dummyTasks, dummyCategories } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { ArrowLeft, Save, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const task = dummyTasks.find(t => t.id === id);
  
  const [title, setTitle] = useState(task?.title || '');
  const [deadline, setDeadline] = useState(task?.deadline || '');
  const [categoryId, setCategoryId] = useState(task?.categoryId || '');
  const [description, setDescription] = useState(task?.description || '');
  const [completed, setCompleted] = useState(task?.completed || false);
  const [completionNote, setCompletionNote] = useState(task?.completionNote || '');
  
  const [showSoftDeleteDialog, setShowSoftDeleteDialog] = useState(false);
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const taskCategories = dummyCategories.filter(c => c.type === 'task');

  const handleSave = () => {
    // In real app, save to state/database
    alert('Tugas berhasil disimpan!');
    navigate('/tasks');
  };

  const handleSoftDelete = () => {
    // Mark as deleted
    alert('Tugas dipindahkan ke tempat sampah. Anda masih bisa memulihkannya.');
    setShowSoftDeleteDialog(false);
    navigate('/tasks');
  };

  const handleHardDelete = () => {
    // Permanent delete
    alert('Tugas berhasil dihapus permanen!');
    setShowHardDeleteDialog(false);
    navigate('/tasks');
  };

  const handleComplete = () => {
    setCompleted(true);
    setShowCompleteDialog(false);
    alert('Selamat! Tugas telah diselesaikan.');
  };

  if (!task) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/tasks')} className="gap-2">
          <ArrowLeft size={20} />
          Kembali
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Tugas tidak ditemukan</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (id === 'new') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/tasks')} className="gap-2">
          <ArrowLeft size={20} />
          Kembali
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Tambah Tugas Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Judul Tugas</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Bayar tagihan listrik"
              />
            </div>

            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="category">Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {taskCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tambahkan catatan atau detail..."
                rows={4}
              />
            </div>

            <Button onClick={handleSave} className="w-full gap-2">
              <Save size={20} />
              Simpan Tugas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate('/tasks')} className="gap-2">
          <ArrowLeft size={20} />
          Kembali
        </Button>
        {completed && (
          <Badge variant="secondary" className="gap-2">
            <CheckCircle2 size={16} />
            Selesai
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail Tugas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Judul Tugas</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={completed}
            />
          </div>

          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={completed}
            />
          </div>

          <div>
            <Label htmlFor="category">Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={completed}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={completed}
            />
          </div>

          {completed && completionNote && (
            <div>
              <Label>Catatan Penyelesaian</Label>
              <Textarea
                value={completionNote}
                readOnly
                rows={3}
                className="bg-green-50"
              />
            </div>
          )}

          {!completed && (
            <div>
              <Label htmlFor="completionNote">Catatan Penyelesaian (Opsional)</Label>
              <Textarea
                id="completionNote"
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="Tambahkan catatan saat menyelesaikan tugas..."
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {!completed ? (
              <>
                <Button onClick={handleSave} className="flex-1 gap-2">
                  <Save size={20} />
                  Simpan Perubahan
                </Button>
                <Button
                  onClick={() => setShowCompleteDialog(true)}
                  variant="outline"
                  className="flex-1 gap-2 text-green-600 border-green-600 hover:bg-green-50"
                >
                  <CheckCircle2 size={20} />
                  Tandai Selesai
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setCompleted(false)}
                variant="outline"
                className="flex-1 gap-2"
              >
                Tandai Belum Selesai
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Options */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle size={20} />
            Zona Berbahaya
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2 text-orange-600 border-orange-600 hover:bg-orange-50"
              onClick={() => setShowSoftDeleteDialog(true)}
            >
              <Trash2 size={16} />
              Hapus Sementara
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={() => setShowHardDeleteDialog(true)}
            >
              <Trash2 size={16} />
              Hapus Permanen
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            <strong>Hapus Sementara:</strong> Tugas dipindahkan ke tempat sampah dan masih bisa dipulihkan.<br />
            <strong>Hapus Permanen:</strong> Tugas akan dihapus selamanya dan tidak bisa dipulihkan.
          </p>
        </CardContent>
      </Card>

      {/* Soft Delete Dialog */}
      <Dialog open={showSoftDeleteDialog} onOpenChange={setShowSoftDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Tugas Sementara?</DialogTitle>
            <DialogDescription>
              Tugas akan dipindahkan ke tempat sampah. Anda masih bisa memulihkannya nanti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSoftDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="default" onClick={handleSoftDelete}>
              Ya, Hapus Sementara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Dialog */}
      <Dialog open={showHardDeleteDialog} onOpenChange={setShowHardDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus Tugas Permanen?</DialogTitle>
            <DialogDescription>
              <strong className="text-red-600">Peringatan!</strong> Tugas akan dihapus selamanya dan tidak bisa dipulihkan. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHardDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleHardDelete}>
              Ya, Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle2 size={24} />
              Selesaikan Tugas?
            </DialogTitle>
            <DialogDescription>
              Tugas akan ditandai sebagai selesai. Anda masih bisa mengubahnya kembali jika diperlukan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Batal
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleComplete}
            >
              Ya, Tandai Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
