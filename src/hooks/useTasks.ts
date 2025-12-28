import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as taskService from '../services/taskService';
import type { Database } from '../types/database.types';
import type { TaskFilters } from '../services/taskService';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

/**
 * Custom Hook untuk Tasks Management
 */
export function useTasks(initialFilters?: TaskFilters) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters | undefined>(initialFilters);

  /**
   * Fetch tasks
   */
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getTasks(user.id, filters);
      setTasks(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  /**
   * Create new task
   */
  const addTask = async (
    taskData: Omit<TaskInsert, 'user_id' | 'id'>
  ): Promise<TaskRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const newTask = await taskService.createTask(user.id, taskData);
      setTasks((prev) => [newTask, ...prev]);
      return newTask;
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding task:', err);
      return null;
    }
  };

  /**
   * Update task
   */
  const editTask = async (
    taskId: string,
    updates: TaskUpdate
  ): Promise<TaskRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const updatedTask = await taskService.updateTask(user.id, taskId, updates);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );
      return updatedTask;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating task:', err);
      return null;
    }
  };

  /**
   * Toggle task completion
   */
  const toggleComplete = async (
    taskId: string,
    completed: boolean,
    completionNote?: string
  ): Promise<TaskRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const updatedTask = await taskService.toggleTaskComplete(
        user.id,
        taskId,
        completed,
        completionNote
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );
      return updatedTask;
    } catch (err: any) {
      setError(err.message);
      console.error('Error toggling task completion:', err);
      return null;
    }
  };

  /**
   * Soft delete task
   */
  const softDelete = async (taskId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      const deletedTask = await taskService.softDeleteTask(user.id, taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? deletedTask : t))
      );
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error soft deleting task:', err);
      return false;
    }
  };

  /**
   * Hard delete task (permanent)
   */
  const hardDelete = async (taskId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      await taskService.hardDeleteTask(user.id, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error hard deleting task:', err);
      return false;
    }
  };

  /**
   * Restore task
   */
  const restore = async (taskId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      const restoredTask = await taskService.restoreTask(user.id, taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? restoredTask : t))
      );
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error restoring task:', err);
      return false;
    }
  };

  /**
   * Update filters
   */
  const updateFilters = (newFilters: TaskFilters) => {
    setFilters(newFilters);
  };

  /**
   * Get task by ID
   */
  const getTaskById = useCallback(
    (taskId: string): TaskRow | undefined => {
      return tasks.find((t) => t.id === taskId);
    },
    [tasks]
  );

  /**
   * Get urgent tasks (Mendesak status)
   */
  const getUrgentTasks = useCallback((): TaskRow[] => {
    return tasks.filter((t) => t.status === 'Mendesak' && !t.completed && !t.deleted);
  }, [tasks]);

  /**
   * Get completed tasks
   */
  const getCompletedTasks = useCallback((): TaskRow[] => {
    return tasks.filter((t) => t.completed && !t.deleted);
  }, [tasks]);

  /**
   * Get pending tasks (not completed, not deleted)
   */
  const getPendingTasks = useCallback((): TaskRow[] => {
    return tasks.filter((t) => !t.completed && !t.deleted);
  }, [tasks]);

  // Fetch tasks saat component mount atau user/filters berubah
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    filters,
    fetchTasks,
    addTask,
    editTask,
    toggleComplete,
    softDelete,
    hardDelete,
    restore,
    updateFilters,
    getTaskById,
    getUrgentTasks,
    getCompletedTasks,
    getPendingTasks,
  };
}