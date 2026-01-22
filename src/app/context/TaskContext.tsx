// src/app/context/TaskContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Task } from '../types';
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

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks
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

      setTasks(data || []);
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when user changes
  useEffect(() => {
    fetchTasks();
  }, [user]);

  // Get task by ID
  const getTaskById = (id: string) => {
    return tasks.find(t => t.id === id);
  };

  // Create task (status will be auto-calculated by database trigger)
  const createTask = async (task: Omit<Task, 'id' | 'status'>) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');

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
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state
      setTasks(prev => [...prev, data]);

      return { success: true, data, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update task
  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      setError(null);

      // Prepare update object (convert camelCase to snake_case for DB)
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

      // Update local state
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...updates } : t))
      );

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Delete task
  const deleteTask = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setTasks(prev => prev.filter(t => t.id !== id));

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Complete task
  const completeTask = async (id: string, note?: string) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          completed: true,
          completion_note: note,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setTasks(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, completed: true, completionNote: note }
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

  // Refresh tasks
  const refreshTasks = async () => {
    await fetchTasks();
  };

  const value = {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    getTaskById,
    refreshTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within TaskProvider');
  }
  return context;
}