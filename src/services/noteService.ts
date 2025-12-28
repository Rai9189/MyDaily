import { supabase, handleSupabaseError, logError } from '../lib/supabase';
import type { Database } from '../types/database.types';

type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];
type NoteUpdate = Database['public']['Tables']['notes']['Update'];

/**
 * Note Service
 * Business logic untuk notes management
 */

export interface NoteFilters {
  categoryId?: string;
  pinned?: boolean;
  searchQuery?: string;
}

/**
 * Get all notes dengan filter
 */
export async function getNotes(
  userId: string,
  filters?: NoteFilters
): Promise<NoteRow[]> {
  try {
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.pinned !== undefined) {
      query = query.eq('pinned', filters.pinned);
    }

    if (filters?.searchQuery) {
      // Search di title dan content
      query = query.or(
        `title.ilike.%${filters.searchQuery}%,content.ilike.%${filters.searchQuery}%`
      );
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    logError('getNotes', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Get note by ID
 */
export async function getNoteById(
  userId: string,
  noteId: string
): Promise<NoteRow | null> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('getNoteById', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Create new note
 */
export async function createNote(
  userId: string,
  noteData: Omit<NoteInsert, 'user_id' | 'id'>
): Promise<NoteRow> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        ...noteData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('createNote', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Update note
 */
export async function updateNote(
  userId: string,
  noteId: string,
  updates: NoteUpdate
): Promise<NoteRow> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('updateNote', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Toggle note pin status
 */
export async function toggleNotePin(
  userId: string,
  noteId: string,
  pinned: boolean
): Promise<NoteRow> {
  try {
    return await updateNote(userId, noteId, { pinned });
  } catch (error: any) {
    logError('toggleNotePin', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Delete note (permanent)
 */
export async function deleteNote(
  userId: string,
  noteId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error: any) {
    logError('deleteNote', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Get pinned notes
 */
export async function getPinnedNotes(userId: string): Promise<NoteRow[]> {
  try {
    return await getNotes(userId, { pinned: true });
  } catch (error: any) {
    logError('getPinnedNotes', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Search notes
 */
export async function searchNotes(
  userId: string,
  searchQuery: string
): Promise<NoteRow[]> {
  try {
    return await getNotes(userId, { searchQuery });
  } catch (error: any) {
    logError('searchNotes', error);
    throw new Error(handleSupabaseError(error));
  }
}