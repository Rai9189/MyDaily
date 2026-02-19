// src/app/context/__tests__/TaskContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { TaskProvider, useTasks } from '../TaskContext';
import { AuthProvider } from '../AuthContext';
import { supabase } from '../../../lib/supabase';
import { mockUser, mockTask, mockCategory } from '../../../test/utils';

vi.mock('../AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
    loading: false,
    error: null,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <TaskProvider>{children}</TaskProvider>
  </AuthProvider>
);

describe('TaskContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // ✅ Setup mock yang PERSISTENT untuk semua test
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
      }, { timeout: 3000 });

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
      }, { timeout: 3000 });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.tasks).toEqual([]);
    });
  });

  describe('Create Task', () => {
    it('should create a new task successfully', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      // ✅ Wait for initial load first
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const newTask = {
        title: 'New Task',
        deadline: '2025-02-01',
        categoryId: mockCategory.id,
        description: 'Task description',
        completed: false,
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createTask(newTask);
      });

      expect(createResult).toHaveProperty('success', true);
      expect(createResult).toHaveProperty('error', null);
    });

    it('should handle create task error', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      // ✅ Mock error AFTER initial load
      const errorMessage = 'Insert failed';
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error(errorMessage),
          }),
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        insert: insertMock,
      } as any);

      let createResult;
      await act(async () => {
        createResult = await result.current.createTask({
          title: 'Test',
          deadline: '2025-02-01',
          categoryId: 'cat1',
          completed: false,
        });
      });

      expect(createResult).toHaveProperty('success', false);
      expect(createResult).toHaveProperty('error', errorMessage);
    });
  });

  describe('Update Task', () => {
    it('should update task successfully', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateTask(mockTask.id, {
          title: 'Updated Task',
        });
      });

      expect(updateResult).toHaveProperty('success', true);
      expect(updateResult).toHaveProperty('error', null);
    });
  });

  describe('Delete Task', () => {
    it('should delete task successfully', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteTask(mockTask.id);
      });

      expect(deleteResult).toHaveProperty('success', true);
      expect(deleteResult).toHaveProperty('error', null);
    });
  });

  describe('Complete Task', () => {
    it('should complete task successfully', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      let completeResult;
      await act(async () => {
        completeResult = await result.current.completeTask(mockTask.id, 'Task completed successfully');
      });

      expect(completeResult).toHaveProperty('success', true);
      expect(completeResult).toHaveProperty('error', null);
    });

    it('should complete task without note', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      let completeResult;
      await act(async () => {
        completeResult = await result.current.completeTask(mockTask.id);
      });

      expect(completeResult).toHaveProperty('success', true);
      expect(completeResult).toHaveProperty('error', null);
    });

    it('should handle complete task error', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const errorMessage = 'Complete failed';
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error(errorMessage),
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        update: updateMock,
      } as any);

      let completeResult;
      await act(async () => {
        completeResult = await result.current.completeTask('task-1', 'Done');
      });

      expect(completeResult).toHaveProperty('success', false);
      expect(completeResult).toHaveProperty('error', errorMessage);
    });
  });

  describe('Get Task By ID', () => {
    it('should return task by id', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const task = result.current.getTaskById(mockTask.id);
      expect(task).toEqual(mockTask);
    });

    it('should return undefined for non-existent id', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const task = result.current.getTaskById('non-existent');
      expect(task).toBeUndefined();
    });
  });

  describe('Refresh Tasks', () => {
    it('should refresh tasks list', async () => {
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.refreshTasks();
      });

      expect(result.current.tasks).toHaveLength(1);
    });
  });
});