import { supabase, handleSupabaseError, logError } from '../lib/supabase';
import type { Database } from '../types/database.types';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

/**
 * Task Service
 * Business logic untuk tasks management
 */

export interface TaskFilters {
  status?: 'Masih Lama' | 'Mendekati' | 'Mendesak';
  categoryId?: string;
  completed?: boolean;
  showDeleted?: boolean;
}

/**
 * Get all tasks dengan filter
 */
export async function getTasks(
  userId: string,
  filters?: TaskFilters
): Promise<TaskRow[]> {
  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.completed !== undefined) {
      query = query.eq('completed', filters.completed);
    }

    if (!filters?.showDeleted) {
      query = query.eq('deleted', false);
    }

    const { data, error } = await query.order('deadline', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    logError('getTasks', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Get task by ID
 */
export async function getTaskById(
  userId: string,
  taskId: string
): Promise<TaskRow | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('getTaskById', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Create new task
 */
export async function createTask(
  userId: string,
  taskData: Omit<TaskInsert, 'user_id' | 'id'>
): Promise<TaskRow> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('createTask', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Update task
 */
export async function updateTask(
  userId: string,
  taskId: string,
  updates: TaskUpdate
): Promise<TaskRow> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('updateTask', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Toggle task completion
 */
export async function toggleTaskComplete(
  userId: string,
  taskId: string,
  completed: boolean,
  completionNote?: string
): Promise<TaskRow> {
  try {
    const updates: TaskUpdate = {
      completed,
      completion_note: completed ? completionNote : null,
    };

    return await updateTask(userId, taskId, updates);
  } catch (error: any) {
    logError('toggleTaskComplete', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Soft delete task
 */
export async function softDeleteTask(
  userId: string,
  taskId: string
): Promise<TaskRow> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('softDeleteTask', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Hard delete task (permanent)
 */
export async function hardDeleteTask(
  userId: string,
  taskId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error: any) {
    logError('hardDeleteTask', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Restore soft deleted task
 */
export async function restoreTask(
  userId: string,
  taskId: string
): Promise<TaskRow> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        deleted: false,
        deleted_at: null,
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('restoreTask', error);
    throw new Error(handleSupabaseError(error));
  }
}