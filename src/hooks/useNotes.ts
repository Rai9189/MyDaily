import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as noteService from '../services/noteService';
import type { Database } from '../types/database.types';
import type { NoteFilters } from '../services/noteService';

type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];
type NoteUpdate = Database['public']['Tables']['notes']['Update'];

/**
 * Custom Hook untuk Notes Management
 */
export function useNotes(initialFilters?: NoteFilters) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NoteFilters | undefined>(initialFilters);

  /**
   * Fetch notes
   */
  const fetchNotes = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await noteService.getNotes(user.id, filters);
      setNotes(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  /**
   * Create new note
   */
  const addNote = async (
    noteData: Omit<NoteInsert, 'user_id' | 'id'>
  ): Promise<NoteRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const newNote = await noteService.createNote(user.id, noteData);
      setNotes((prev) => [newNote, ...prev]);
      return newNote;
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding note:', err);
      return null;
    }
  };

  /**
   * Update note
   */
  const editNote = async (
    noteId: string,
    updates: NoteUpdate
  ): Promise<NoteRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const updatedNote = await noteService.updateNote(user.id, noteId, updates);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? updatedNote : n))
      );
      return updatedNote;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating note:', err);
      return null;
    }
  };

  /**
   * Toggle note pin
   */
  const togglePin = async (
    noteId: string,
    pinned: boolean
  ): Promise<NoteRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const updatedNote = await noteService.toggleNotePin(user.id, noteId, pinned);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? updatedNote : n))
      );
      return updatedNote;
    } catch (err: any) {
      setError(err.message);
      console.error('Error toggling note pin:', err);
      return null;
    }
  };

  /**
   * Delete note (permanent)
   */
  const removeNote = async (noteId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      await noteService.deleteNote(user.id, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting note:', err);
      return false;
    }
  };

  /**
   * Search notes
   */
  const searchNotes = async (searchQuery: string) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await noteService.searchNotes(user.id, searchQuery);
      setNotes(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error searching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update filters
   */
  const updateFilters = (newFilters: NoteFilters) => {
    setFilters(newFilters);
  };

  /**
   * Get note by ID
   */
  const getNoteById = useCallback(
    (noteId: string): NoteRow | undefined => {
      return notes.find((n) => n.id === noteId);
    },
    [notes]
  );

  /**
   * Get pinned notes
   */
  const getPinnedNotes = useCallback((): NoteRow[] => {
    return notes.filter((n) => n.pinned);
  }, [notes]);

  /**
   * Get regular notes (not pinned)
   */
  const getRegularNotes = useCallback((): NoteRow[] => {
    return notes.filter((n) => !n.pinned);
  }, [notes]);

  // Fetch notes saat component mount atau user/filters berubah
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    loading,
    error,
    filters,
    fetchNotes,
    addNote,
    editNote,
    togglePin,
    removeNote,
    searchNotes,
    updateFilters,
    getNoteById,
    getPinnedNotes,
    getRegularNotes,
  };
}