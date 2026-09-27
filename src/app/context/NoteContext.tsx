// src/app/context/NoteContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { withErrorHandling, withErrorHandlingNoData } from '../../lib/errorHandler';
import { Note, Attachment } from '../types';
import { useAuth } from './AuthContext';
import { trashEvents } from '../../lib/trashEvents';

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

// Readable note URL: "/notes/<title-slug>-<first 8 chars of id>". The id suffix
// keeps links unique and working after a rename.
// ponytail: 8-char id prefix match, collision-free in practice for one user's notes.
export function notePath(note: Pick<Note, 'id' | 'title'>) {
  const slug = note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `/notes/${[slug, note.id.slice(0, 8)].filter(Boolean).join('-')}`;
}

function mapToNote(row: any): Note {
  return {
    id: row.id,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? null,
    title: row.title,
    content: row.content,
    pinned: row.pinned,
    timestamp: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

export function NoteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    if (!user) { setNotes([]); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;

      const noteList = data || [];
      let attMap: Record<string, Attachment[]> = {};
      if (noteList.length > 0) {
        const { data: attData, error: attError } = await supabase
          .from('attachments')
          .select('id, name, type, url, attachable_id')
          .eq('attachable_type', 'note')
          .in('attachable_id', noteList.map(n => n.id));
        if (attError) console.warn('Failed to load note attachments:', attError.message);
        (attData || []).forEach(att => {
          if (!attMap[att.attachable_id]) attMap[att.attachable_id] = [];
          attMap[att.attachable_id].push({ id: att.id, name: att.name, type: att.type, url: att.url });
        });
      }

      setNotes(noteList.map(row => ({ ...mapToNote(row), attachments: attMap[row.id] || [] })));
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    const unsub = trashEvents.subscribeRestore((table) => {
      if (table === 'notes') fetchNotes();
    });
    return unsub;
  }, [user]);

  // Accepts a full id (old links) or a notePath() param ending in the 8-char id prefix.
  const getNoteById = (id: string) =>
    notes.find(n => n.id === id) ?? (id.length >= 8 ? notes.find(n => n.id.startsWith(id.slice(-8))) : undefined);

  const createNote = async (note: Omit<Note, 'id' | 'timestamp'>) => {
    if (!user) {
      const errorMessage = 'User not authenticated';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setError(null);
    return withErrorHandling(
      () => supabase
        .from('notes')
        .insert({
          user_id: user.id,
          category_id: note.categoryId,
          subcategory_id: note.subcategoryId ?? null,
          title: note.title,
          content: note.content,
          pinned: note.pinned || false,
        })
        .select()
        .single(),
      { setError }
    ).then(result => {
      if (result.success && result.data) {
        const mapped: Note = { ...mapToNote(result.data), attachments: [] };
        setNotes(prev => [mapped, ...prev]);
        return { success: true, data: mapped, error: null };
      }
      return { success: false, error: result.error };
    });
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (id === 'new') {
      const errorMessage = 'Invalid note ID';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setError(null);
    const dbUpdates: any = {};
    if (updates.categoryId    !== undefined) dbUpdates.category_id    = updates.categoryId;
    if (updates.subcategoryId !== undefined) dbUpdates.subcategory_id = updates.subcategoryId ?? null;
    if (updates.title         !== undefined) dbUpdates.title          = updates.title;
    if (updates.content       !== undefined) dbUpdates.content        = updates.content;
    if (updates.pinned        !== undefined) dbUpdates.pinned         = updates.pinned;

    // .select().single() errors when no row was updated (e.g. blocked by RLS)
    // instead of silently "succeeding", and returns the fresh updated_at.
    const result = await withErrorHandling(
      () => supabase.from('notes').update(dbUpdates).eq('id', id).select().single(),
      { setError }
    );

    if (!result.success || !result.data) return { success: false, error: result.error ?? 'Failed to update note' };
    const updated = mapToNote(result.data);
    setNotes(prev => prev.map(n => (n.id === id ? { ...updated, attachments: n.attachments } : n)));
    return { success: true, error: null };
  };

  const deleteNote = async (id: string) => {
    setError(null);
    const result = await withErrorHandlingNoData(
      () => supabase
        .from('notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id),
      { setError }
    );

    if (result.success) {
      setNotes(prev => prev.filter(n => n.id !== id));
      trashEvents.emit();
    }

    return result;
  };

  const togglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return { success: false, error: 'Note not found' };
    return updateNote(id, { pinned: !note.pinned });
  };

  const refreshNotes = async () => { await fetchNotes(); };

  const value = { notes, loading, error, createNote, updateNote, deleteNote, togglePin, getNoteById, refreshNotes };
  return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>;
}

export function useNotes() {
  const context = useContext(NoteContext);
  if (!context) throw new Error('useNotes must be used within NoteProvider');
  return context;
}