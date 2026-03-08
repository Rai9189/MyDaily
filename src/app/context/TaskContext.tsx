// src/app/context/TaskContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Task, TaskStatus } from '../types';
import { useAuth } from './AuthContext';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (task: Omit<Task, 'id' | 'status'>) => Promise<{ success: boolean; data?: Task; error: string | null }>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<{ success: boolean; error: string | null }>;
  deleteTask: (id: string) => Promise<{ success: boolean; error: string | null }>;
  completeTask: (id: string, note?: string) => Promise<{ success: boolean; error: string | null }>;
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

  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 3) return 'urgent';
  if (daysLeft <= 7) return 'upcoming';
  return 'on_track';
}

function mapToTask(row: any): Task {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description || '',
    deadline: row.deadline,
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
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true });

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
  }, [user]);

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  const createTask = async (task: Omit<Task, 'id' | 'status'>) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');

      // ✅ FIX: Gunakan returning: 'minimal' + select id saja
      // Hindari round trip kedua dengan .select().single() yang lambat
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          category_id: task.categoryId,
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          completed: task.completed || false,
          completion_note: task.completionNote,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // ✅ FIX: Bangun objek Task langsung dari data form + id dari DB
      // Tidak perlu fetch ulang seluruh row dari Supabase
      const newTask: Task = {
        id: data.id,
        categoryId: task.categoryId,
        title: task.title,
        description: task.description || '',
        deadline: task.deadline,
        completed: task.completed || false,
        completionNote: task.completionNote || '',
        status: computeStatus(task.deadline, task.completed || false),
      };

      setTasks(prev => [...prev, newTask]);

      return { success: true, data: newTask, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      setError(null);
      if (!id || id === 'new') throw new Error('Invalid task ID');

      const dbUpdates: any = {};
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.completionNote !== undefined) dbUpdates.completion_note = updates.completionNote;

      const { error: updateError } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      setTasks(prev =>
        prev.map(t => {
          if (t.id !== id) return t;
          const merged = { ...t, ...updates };
          return { ...merged, status: computeStatus(merged.deadline, merged.completed) };
        })
      );

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteTask = async (id: string) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase.from('tasks').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setTasks(prev => prev.filter(t => t.id !== id));
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const completeTask = async (id: string, note?: string) => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ completed: true, completion_note: note, completed_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      setTasks(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, completed: true, completionNote: note, status: computeStatus(t.deadline, true) }
            : t
        )
      );
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const refreshTasks = async () => { await fetchTasks(); };

  const value = { tasks, loading, error, createTask, updateTask, deleteTask, completeTask, getTaskById, refreshTasks };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within TaskProvider');
  return context;
}