import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dummyTasks, dummyCategories } from '../data/dummyData';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, AlertCircle, Clock, CheckCircle2, ArrowUpDown, Trash2, Edit } from 'lucide-react';
import { Task } from '../types';

export function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(dummyTasks);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<'deadline' | 'status'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const taskCategories = dummyCategories.filter(c => c.type === 'task');

  const getCategoryName = (categoryId: string) => {
    return dummyCategories.find(c => c.id === categoryId)?.name || 'Lainnya';
  };

  const getCategoryColor = (categoryId: string) => {
    return dummyCategories.find(c => c.id === categoryId)?.color || '#gray';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Mendesak': return 'destructive';
      case 'Mendekati': return 'default';
      case 'Masih Lama': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Mendesak': return <AlertCircle size={16} className="text-red-600" />;
      case 'Mendekati': return <Clock size={16} className="text-orange-600" />;
      case 'Masih Lama': return <CheckCircle2 size={16} className="text-green-600" />;
      default: return null;
    }
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleSoftDelete = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, deleted: true, deletedAt: new Date().toISOString() } : task
    ));
  };

  let filteredTasks = tasks.filter(t => {
    if (!showDeleted && t.deleted) return false;
    if (!showCompleted && t.completed) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterCategory !== 'all' && t.categoryId !== filterCategory) return false;
    return true;
  });

  // Sort tasks
  filteredTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'deadline') {
      const dateA = new Date(a.deadline).getTime();
      const dateB = new Date(b.deadline).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      const statusOrder = { 'Mendesak': 3, 'Mendekati': 2, 'Masih Lama': 1 };
      const statusA = statusOrder[a.status as keyof typeof statusOrder];
      const statusB = statusOrder[b.status as keyof typeof statusOrder];
      return sortOrder === 'asc' ? statusA - statusB : statusB - statusA;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl">Tugas</h1>
          <p className="text-gray-500 mt-1">Kelola semua tugas Anda</p>
        </div>
        <Button onClick={() => navigate('/tasks/new')} className="gap-2">
          <Plus size={20} />
          Tambah Tugas
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Filter Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Mendesak">Mendesak</SelectItem>
                  <SelectItem value="Mendekati">Mendekati</SelectItem>
                  <SelectItem value="Masih Lama">Masih Lama</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Filter Kategori</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {taskCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Urutkan</label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v: 'deadline' | 'status') => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown size={16} />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Tampilkan</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showCompleted"
                    checked={showCompleted}
                    onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
                  />
                  <label htmlFor="showCompleted" className="text-sm cursor-pointer">
                    Tugas Selesai
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showDeleted"
                    checked={showDeleted}
                    onCheckedChange={(checked) => setShowDeleted(checked as boolean)}
                  />
                  <label htmlFor="showDeleted" className="text-sm cursor-pointer">
                    Tugas Dihapus
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => (
          <Card
            key={task.id}
            className={`hover:shadow-lg transition-all ${
              task.completed ? 'bg-gray-50 opacity-75' : ''
            } ${task.deleted ? 'border-red-200 bg-red-50' : ''}`}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header with Checkbox */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggleComplete(task.id)}
                    className="mt-1"
                    disabled={task.deleted}
                  />
                  <div className="flex-1">
                    <h3 className={`text-lg ${task.completed ? 'line-through text-gray-500' : ''}`}>
                      {task.title}
                    </h3>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap ml-8">
                  <Badge variant={getStatusColor(task.status)} className="gap-1">
                    {getStatusIcon(task.status)}
                    {task.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: getCategoryColor(task.categoryId),
                      color: getCategoryColor(task.categoryId)
                    }}
                  >
                    {getCategoryName(task.categoryId)}
                  </Badge>
                  {task.completed && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 size={12} />
                      Selesai
                    </Badge>
                  )}
                  {task.deleted && (
                    <Badge variant="destructive" className="gap-1">
                      <Trash2 size={12} />
                      Dihapus
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {task.description && (
                  <p className={`text-sm text-gray-600 ml-8 ${task.completed ? 'line-through' : ''}`}>
                    {task.description}
                  </p>
                )}

                {/* Deadline */}
                <div className="ml-8">
                  <p className="text-sm text-gray-500">
                    <Clock size={14} className="inline mr-1" />
                    Deadline: {new Date(task.deadline).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-8 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-1"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    disabled={task.deleted}
                  >
                    <Edit size={16} />
                    {task.completed ? 'Lihat Detail' : 'Edit'}
                  </Button>
                  {!task.deleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 hover:bg-red-50"
                      onClick={() => handleSoftDelete(task.id)}
                    >
                      <Trash2 size={16} />
                      Hapus
                    </Button>
                  )}
                  {task.deleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-green-600 hover:bg-green-50"
                      onClick={() => setTasks(tasks.map(t =>
                        t.id === task.id ? { ...t, deleted: false, deletedAt: undefined } : t
                      ))}
                    >
                      Pulihkan
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <p>Tidak ada tugas ditemukan</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
