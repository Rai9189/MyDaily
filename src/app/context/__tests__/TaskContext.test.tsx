// src/app/context/__tests__/TaskContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { TaskProvider, useTasks } from '../TaskContext';
import { AuthProvider } from '../AuthContext';
import { supabase } from '../../../lib/supabase';
import { mockUser, mockTask, mockCategory } from '../../../test/utils';

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  handleSupabaseError: vi.fn((err) => err.message || 'Unknown error'),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <TaskProvider>{children}</TaskProvider>
  </AuthProvider>
);

describe('TaskContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [mockTask],
            error: null,
          }),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockTask,
            error: null,
          }),
        } as any;
      }
      return {} as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with empty tasks and loading true', () => {
      const { result } = renderHook(() => useTasks(), { wrapper });
      
      expect(result.current.tasks).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useTasks());
      }).toThrow('useTasks must be used within TaskProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Fetch Tasks', () => {
    it('should fetch tasks on mount when user is authenticated', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toEqual(mockTask);
      expect(result.current.error).toBe(null);
    });

    it('should handle fetch error gracefully', async () => {
      const errorMessage = 'Failed to fetch tasks';
      vi.spyOn(supabase, 'from').mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error(errorMessage),
        }),
      } as any));

      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.tasks).toEqual([]);
    });
  });

  describe('Create Task', () => {
    it('should create a new task successfully', async () => {
      const newTask = {
        title: 'New Task',
        deadline: '2025-02-01',
        categoryId: mockCategory.id,
        description: 'Task description',
        completed: false,
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { id: 'new-task-id', ...newTask, status: 'Masih Lama' },
        error: null,
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      insertMock.mockReturnValue({ select: selectMock });
      selectMock.mockReturnValue({ single: singleMock });

      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createResult;
      await act(async () => {
        createResult = await result.current.createTask(newTask);
      });

      expect(createResult).toEqual({ success: true, data: expect.any(Object), error: null });
      expect(insertMock).toHaveBeenCalled();
    });

    it('should handle create task error', async () => {
      const errorMessage = 'Insert failed';
      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      insertMock.mockReturnValue({ select: selectMock });
      selectMock.mockReturnValue({ single: singleMock });

      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createResult;
      await act(async () => {
        createResult = await result.current.createTask({
          title: 'Test',
          deadline: '2025-02-01',
          categoryId: 'cat1',
          completed: false,
        });
      });

      expect(createResult).toEqual({ success: false, error: errorMessage });
    });
  });

  describe('Update Task', () => {
    it('should update task successfully', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockTask], error: null }),
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      updateMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateTask(mockTask.id, {
          title: 'Updated Task',
        });
      });

      expect(updateResult).toEqual({ success: true, error: null });
      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('Delete Task', () => {
    it('should delete task successfully', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockTask], error: null }),
            delete: deleteMock,
          } as any;
        }
        return {} as any;
      });

      deleteMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteTask(mockTask.id);
      });

      expect(deleteResult).toEqual({ success: true, error: null });
      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe('Complete Task', () => {
    it('should complete task successfully', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockTask], error: null }),
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      updateMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let completeResult;
      await act(async () => {
        completeResult = await result.current.completeTask(mockTask.id, 'Task completed successfully');
      });

      expect(completeResult).toEqual({ success: true, error: null });
      expect(updateMock).toHaveBeenCalledWith({
        completed: true,
        completion_note: 'Task completed successfully',
        completed_at: expect.any(String),
      });
    });

    it('should complete task without note', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockTask], error: null }),
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      updateMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let completeResult;
      await act(async () => {
        completeResult = await result.current.completeTask(mockTask.id);
      });

      expect(completeResult).toEqual({ success: true, error: null });
      expect(updateMock).toHaveBeenCalled();
    });

    it('should handle complete task error', async () => {
      const errorMessage = 'Complete failed';
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockTask], error: null }),
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      updateMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let completeResult;
      await act(async () => {
        completeResult = await result.current.completeTask('task-1', 'Done');
      });

      expect(completeResult).toEqual({ success: false, error: errorMessage });
    });
  });

  describe('Get Task By ID', () => {
    it('should return task by id', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const task = result.current.getTaskById(mockTask.id);
      expect(task).toEqual(mockTask);
    });

    it('should return undefined for non-existent id', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const task = result.current.getTaskById('non-existent');
      expect(task).toBeUndefined();
    });
  });

  describe('Refresh Tasks', () => {
    it('should refresh tasks list', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshTasks();
      });

      expect(result.current.tasks).toHaveLength(1);
    });
  });
});