// src/app/context/TaskContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { withErrorHandling, withErrorHandlingNoData } from '../../lib/errorHandler';
import { Task, TaskStatus } from '../types';
import { useAuth } from './AuthContext';
import { trashEvents } from '../../lib/trashEvents';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (task: Omit<Task, 'id' | 'status'>) => Promise<{ success: boolean; data?: Task; error: string | null }>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<{ success: boolean; error: string | null }>;
  deleteTask: (id: string) => Promise<{ success: boolean; error: string | null }>;
  completeTask: (id: string, note?: string) => Promise<{ success: boolean; error: string | null }>;
  uncompleteTask: (id: string) => Promise<{ success: boolean; error: string | null }>;
  getTaskById: (id: string) => Task | undefined;
  refreshTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

function computeStatus(deadline: string, completed: boolean): TaskStatus {
  if (completed) return 'on_track';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0)  return 'overdue';
  if (daysLeft <= 3) return 'urgent';
  if (daysLeft <= 7) return 'upcoming';
  return 'on_track';
}

function mapToTask(row: any): Task {
  return {
    id: row.id,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? null,
    title: row.title,
    description: row.description || '',
    deadline: row.deadline,
    createdAt: row.created_at ?? null,  // ✅ map created_at untuk tiebreaker
    status: computeStatus(row.deadline, row.completed),
    completed: row.completed,
    completionNote: row.completion_note || '',
  };
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!user) { setTasks([]); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        // ✅ deadline asc, lalu created_at desc sebagai tiebreaker
        // Task dengan deadline sama → yang dibuat lebih baru muncul lebih atas
        .order('deadline', { ascending: true })
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setTasks((data || []).map(mapToTask));
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const unsub = trashEvents.subscribeRestore((table) => {
      if (table === 'tasks') fetchTasks();
    });
    return unsub;
  }, [user]);

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  const createTask = async (task: Omit<Task, 'id' | 'status'>) => {
    setError(null);
    if (!user) {
      const msg = 'User not authenticated';
      setError(msg);
      return { success: false, error: msg };
    }
    return withErrorHandling<any>(
      () => supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          category_id: task.categoryId,
          subcategory_id: task.subcategoryId ?? null,
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          completed: task.completed || false,
          completion_note: task.completionNote,
        })
        .select()
        .single(),
      { setError }
    ).then(result => {
      if (result.success && result.data) {
        const newTask: Task = {
          id: result.data.id,
          categoryId: task.categoryId,
          subcategoryId: task.subcategoryId ?? null,
          title: task.title,
          description: task.description || '',
          deadline: task.deadline,
          createdAt: result.data.created_at ?? null,
          completed: task.completed || false,
          completionNote: task.completionNote || '',
          status: computeStatus(task.deadline, task.completed || false),
        };
        setTasks(prev => [...prev, newTask]);
        return { success: true, data: newTask, error: null };
      }
      return { success: false, error: result.error };
    });
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setError(null);
    if (!id || id === 'new') {
      const msg = 'Invalid task ID';
      setError(msg);
      return { success: false, error: msg };
    }
    const dbUpdates: any = {};
    if (updates.categoryId     !== undefined) dbUpdates.category_id     = updates.categoryId;
    if (updates.subcategoryId  !== undefined) dbUpdates.subcategory_id  = updates.subcategoryId ?? null;
    if (updates.title          !== undefined) dbUpdates.title           = updates.title;
    if (updates.description    !== undefined) dbUpdates.description     = updates.description;
    if (updates.deadline       !== undefined) dbUpdates.deadline        = updates.deadline;
    if (updates.completed      !== undefined) dbUpdates.completed       = updates.completed;
    if (updates.completionNote !== undefined) dbUpdates.completion_note = updates.completionNote;

    return withErrorHandlingNoData(
      () => supabase.from('tasks').update(dbUpdates).eq('id', id),
      { setError }
    ).then(result => {
      if (result.success) {
        setTasks(prev =>
          prev.map(t => {
            if (t.id !== id) return t;
            const merged = { ...t, ...updates };
            return { ...merged, status: computeStatus(merged.deadline, merged.completed) };
          })
        );
      }
      return result;
    });
  };

  const deleteTask = async (id: string) => {
    setError(null);
    return withErrorHandlingNoData(
      () => supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id),
      { setError }
    ).then(result => {
      if (result.success) {
        setTasks(prev => prev.filter(t => t.id !== id));
        trashEvents.emit();
      }
      return result;
    });
  };

  const completeTask = async (id: string, note?: string) => {
    setError(null);
    return withErrorHandlingNoData(
      () => supabase
        .from('tasks')
        .update({ completed: true, completion_note: note, completed_at: new Date().toISOString() })
        .eq('id', id),
      { setError }
    ).then(result => {
      if (result.success) {
        setTasks(prev =>
          prev.map(t =>
            t.id === id
              ? { ...t, completed: true, completionNote: note || '', status: computeStatus(t.deadline, true) }
              : t
          )
        );
      }
      return result;
    });
  };

  const uncompleteTask = async (id: string) => {
    setError(null);
    return withErrorHandlingNoData(
      () => supabase
        .from('tasks')
        .update({ completed: false, completion_note: null, completed_at: null })
        .eq('id', id),
      { setError }
    ).then(result => {
      if (result.success) {
        setTasks(prev =>
          prev.map(t =>
            t.id === id
              ? { ...t, completed: false, completionNote: '', status: computeStatus(t.deadline, false) }
              : t
          )
        );
      }
      return result;
    });
  };

  const refreshTasks = async () => { await fetchTasks(); };

  const value = {
    tasks, loading, error,
    createTask, updateTask, deleteTask,
    completeTask, uncompleteTask,
    getTaskById, refreshTasks,
  };
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within TaskProvider');
  return context;
}