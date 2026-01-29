// src/app/context/__tests__/NoteContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { NoteProvider, useNotes } from '../NoteContext';
import { AuthProvider } from '../AuthContext';
import { supabase } from '../../../lib/supabase';
import { mockUser, mockNote, mockCategory } from '../../../test/utils';

// ✅ FIXED: Mock useAuth to provide authenticated user
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
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'notes') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
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

    // Mock the order chain for fetching notes
    const orderMock = vi.fn().mockReturnThis();
    orderMock.mockResolvedValue({
      data: [{ ...mockNote, created_at: mockNote.timestamp }],
      error: null,
    });

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'notes') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: orderMock,
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          single: vi.fn(),
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
      });

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
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });

      vi.spyOn(supabase, 'from').mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: orderMock,
      } as any));

      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.notes).toEqual([]);
    });
  });

  describe('Create Note', () => {
    it('should create a new note successfully', async () => {
      const newNote = {
        title: 'New Note',
        content: 'Note content',
        categoryId: mockCategory.id,
        pinned: false,
      };

      const createdNote = {
        id: 'new-note-id',
        ...newNote,
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: createdNote,
        error: null,
      });

      const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'notes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: orderMock,
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      insertMock.mockReturnValue({ select: selectMock });
      selectMock.mockReturnValue({ single: singleMock });

      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createResult;
      await act(async () => {
        createResult = await result.current.createNote(newNote);
      });

      expect(createResult).toEqual({ 
        success: true, 
        data: expect.objectContaining({
          title: newNote.title,
          content: newNote.content,
        }), 
        error: null 
      });
      expect(insertMock).toHaveBeenCalled();
    });

    it('should handle create note error', async () => {
      const errorMessage = 'Insert failed';
      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });

      const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'notes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: orderMock,
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      insertMock.mockReturnValue({ select: selectMock });
      selectMock.mockReturnValue({ single: singleMock });

      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createResult;
      await act(async () => {
        createResult = await result.current.createNote({
          title: 'Test',
          content: 'Content',
          categoryId: 'cat1',
          pinned: false,
        });
      });

      expect(createResult).toEqual({ success: false, error: errorMessage });
    });
  });

  describe('Update Note', () => {
    it('should update note successfully', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const orderMock = vi.fn().mockResolvedValue({
        data: [{ ...mockNote, created_at: mockNote.timestamp }],
        error: null,
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'notes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: orderMock,
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      updateMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateNote(mockNote.id, {
          title: 'Updated Note',
          content: 'Updated content',
        });
      });

      expect(updateResult).toEqual({ success: true, error: null });
      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('Delete Note', () => {
    it('should delete note successfully', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const orderMock = vi.fn().mockResolvedValue({
        data: [{ ...mockNote, created_at: mockNote.timestamp }],
        error: null,
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'notes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: orderMock,
            delete: deleteMock,
          } as any;
        }
        return {} as any;
      });

      deleteMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteNote(mockNote.id);
      });

      expect(deleteResult).toEqual({ success: true, error: null });
      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe('Toggle Pin', () => {
    it('should toggle pin successfully when note is not pinned', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const unpinnedNote = { ...mockNote, pinned: false, created_at: mockNote.timestamp };
      const orderMock = vi.fn().mockResolvedValue({
        data: [unpinnedNote],
        error: null,
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'notes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: orderMock,
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      updateMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let toggleResult;
      await act(async () => {
        toggleResult = await result.current.togglePin(mockNote.id);
      });

      expect(toggleResult).toEqual({ success: true, error: null });
      expect(updateMock).toHaveBeenCalledWith({ pinned: true });
    });

    it('should toggle pin successfully when note is pinned', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const pinnedNote = { ...mockNote, pinned: true, created_at: mockNote.timestamp };
      const orderMock = vi.fn().mockResolvedValue({
        data: [pinnedNote],
        error: null,
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'notes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: orderMock,
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      updateMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let toggleResult;
      await act(async () => {
        toggleResult = await result.current.togglePin(mockNote.id);
      });

      expect(toggleResult).toEqual({ success: true, error: null });
      expect(updateMock).toHaveBeenCalledWith({ pinned: false });
    });

    it('should return error when note not found', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.spyOn(supabase, 'from').mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: orderMock,
      } as any));

      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

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
      });

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
      });

      const note = result.current.getNoteById('non-existent');
      expect(note).toBeUndefined();
    });
  });

  describe('Refresh Notes', () => {
    it('should refresh notes list', async () => {
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNotes();
      });

      expect(result.current.notes).toHaveLength(1);
    });
  });
});