import { supabase, handleSupabaseError, logError } from '../lib/supabase';
import type { Database } from '../types/database.types';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

/**
 * Category Service
 * Business logic untuk categories management
 */

/**
 * Get all categories untuk user
 */
export async function getCategories(
  userId: string,
  type?: 'transaction' | 'task' | 'note'
): Promise<CategoryRow[]> {
  try {
    let query = supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    logError('getCategories', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(
  userId: string,
  categoryId: string
): Promise<CategoryRow | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('getCategoryById', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Create new category
 */
export async function createCategory(
  userId: string,
  categoryData: Omit<CategoryInsert, 'user_id' | 'id'>
): Promise<CategoryRow> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...categoryData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('createCategory', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Update category
 */
export async function updateCategory(
  userId: string,
  categoryId: string,
  updates: CategoryUpdate
): Promise<CategoryRow> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', categoryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('updateCategory', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Delete category
 */
export async function deleteCategory(
  userId: string,
  categoryId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error: any) {
    logError('deleteCategory', error);
    throw new Error(handleSupabaseError(error));
  }
}