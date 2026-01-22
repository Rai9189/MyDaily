// src/app/context/NoteContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Note } from '../types';
import { useAuth } from './AuthContext';

interface NoteContextType {
  notes: Note[];
  loading: boolean;
  error: string | null;
  createNote: (note: Omit<Note, 'id' | 'timestamp'>) => Promise<{ success: boolean; data?: Note; error: string | null }>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<{ success: boolean; error: string | null }>;
  deleteNote: (id: string) => Promise<{ success: boolean; error: string | null }>;
  togglePin: (id: string) => Promise<{ success: boolean; error: string | null }>;
  getNoteById: (id: string) => Note | undefined;
  refreshNotes: () => Promise<void>;
}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export function NoteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notes
  const fetchNotes = async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Convert created_at to timestamp format for compatibility
      const notesWithTimestamp = (data || []).map(note => ({
        ...note,
        timestamp: note.created_at,
      }));

      setNotes(notesWithTimestamp);
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when user changes
  useEffect(() => {
    fetchNotes();
  }, [user]);

  // Get note by ID
  const getNoteById = (id: string) => {
    return notes.find(n => n.id === id);
  };

  // Create note
  const createNote = async (note: Omit<Note, 'id' | 'timestamp'>) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');

      const { data, error: insertError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          category_id: note.categoryId,
          title: note.title,
          content: note.content,
          pinned: note.pinned || false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state with timestamp
      const noteWithTimestamp = {
        ...data,
        timestamp: data.created_at,
      };
      setNotes(prev => [noteWithTimestamp, ...prev]);

      return { success: true, data: noteWithTimestamp, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update note
  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      setError(null);

      // Prepare update object (convert camelCase to snake_case for DB)
      const dbUpdates: any = {};
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.pinned !== undefined) dbUpdates.pinned = updates.pinned;

      const { error: updateError } = await supabase
        .from('notes')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setNotes(prev =>
        prev.map(n => (n.id === id ? { ...n, ...updates } : n))
      );

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Delete note
  const deleteNote = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setNotes(prev => prev.filter(n => n.id !== id));

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Toggle pin
  const togglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return { success: false, error: 'Note not found' };

    return updateNote(id, { pinned: !note.pinned });
  };

  // Refresh notes
  const refreshNotes = async () => {
    await fetchNotes();
  };

  const value = {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    getNoteById,
    refreshNotes,
  };

  return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>;
}

export function useNotes() {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error('useNotes must be used within NoteProvider');
  }
  return context;
}