// src/app/context/__tests__/NoteContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { NoteProvider, useNotes } from '../NoteContext';
import { AuthProvider } from '../AuthContext';
import { supabase } from '../../../lib/supabase';
import { mockUser, mockNote, mockCategory } from '../../../test/utils';

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
    <NoteProvider>{children}</NoteProvider>
  </AuthProvider>
);

describe('NoteContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // ✅ Setup mock yang PERSISTENT dengan double order chain
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'notes') {
        const secondOrderMock = vi.fn().mockResolvedValue({
          data: [{ ...mockNote, created_at: mockNote.timestamp }],
          error: null,
        });
        
        const firstOrderMock = vi.fn().mockReturnValue({
          order: secondOrderMock,
        });

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: firstOrderMock,
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { ...mockNote, created_at: mockNote.timestamp },
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
    it('should start with empty notes and loading true', () => {
      const { result } = renderHook(() => useNotes(), { wrapper });
      
      expect(result.current.notes).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useNotes());
      }).toThrow('useNotes must be used within NoteProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Fetch Notes', () => {
    it('should fetch notes on mount when user is authenticated', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      expect(result.current.notes).toHaveLength(1);
      expect(result.current.notes[0]).toMatchObject({
        id: mockNote.id,
        title: mockNote.title,
        content: mockNote.content,
      });
      expect(result.current.error).toBe(null);
    });

    it('should handle fetch error gracefully', async () => {
      const errorMessage = 'Failed to fetch notes';
      
      const secondOrderMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });
      
      const firstOrderMock = vi.fn().mockReturnValue({
        order: secondOrderMock,
      });

      vi.spyOn(supabase, 'from').mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: firstOrderMock,
      } as any));

      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.notes).toEqual([]);
    });
  });

  describe('Create Note', () => {
    it('should create a new note successfully', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      // ✅ Wait for initial load first
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const newNote = {
        title: 'New Note',
        content: 'Note content',
        categoryId: mockCategory.id,
        pinned: false,
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createNote(newNote);
      });

      expect(createResult).toHaveProperty('success', true);
      expect(createResult).toHaveProperty('error', null);
    });

    it('should handle create note error', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

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
        createResult = await result.current.createNote({
          title: 'Test',
          content: 'Content',
          categoryId: 'cat1',
          pinned: false,
        });
      });

      expect(createResult).toHaveProperty('success', false);
      expect(createResult).toHaveProperty('error', errorMessage);
    });
  });

  describe('Update Note', () => {
    it('should update note successfully', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateNote(mockNote.id, {
          title: 'Updated Note',
          content: 'Updated content',
        });
      });

      expect(updateResult).toHaveProperty('success', true);
      expect(updateResult).toHaveProperty('error', null);
    });
  });

  describe('Delete Note', () => {
    it('should delete note successfully', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteNote(mockNote.id);
      });

      expect(deleteResult).toHaveProperty('success', true);
      expect(deleteResult).toHaveProperty('error', null);
    });
  });

  describe('Toggle Pin', () => {
    it('should toggle pin successfully when note is not pinned', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      // Mock the note as unpinned
      result.current.notes[0].pinned = false;

      let toggleResult;
      await act(async () => {
        toggleResult = await result.current.togglePin(mockNote.id);
      });

      expect(toggleResult).toHaveProperty('success', true);
      expect(toggleResult).toHaveProperty('error', null);
    });

    it('should toggle pin successfully when note is pinned', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      // Mock the note as pinned
      result.current.notes[0].pinned = true;

      let toggleResult;
      await act(async () => {
        toggleResult = await result.current.togglePin(mockNote.id);
      });

      expect(toggleResult).toHaveProperty('success', true);
      expect(toggleResult).toHaveProperty('error', null);
    });

    it('should return error when note not found', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      let toggleResult;
      await act(async () => {
        toggleResult = await result.current.togglePin('non-existent');
      });

      expect(toggleResult).toEqual({ success: false, error: 'Note not found' });
    });
  });

  describe('Get Note By ID', () => {
    it('should return note by id', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const note = result.current.getNoteById(mockNote.id);
      expect(note).toMatchObject({
        id: mockNote.id,
        title: mockNote.title,
      });
    });

    it('should return undefined for non-existent id', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const note = result.current.getNoteById('non-existent');
      expect(note).toBeUndefined();
    });
  });

  describe('Refresh Notes', () => {
    it('should refresh notes list', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.refreshNotes();
      });

      expect(result.current.notes).toHaveLength(1);
    });
  });
});