// src/app/context/CategoryContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Category } from '../types';
import { useAuth } from './AuthContext';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  // Get only top-level (parent) categories by type
  getCategoriesByType: (type: 'transaction' | 'task' | 'note') => Category[];
  // Get subcategories for a specific parent
  getSubcategories: (parentId: string) => Category[];
  // Check if a category has subcategories
  hasSubcategories: (parentId: string) => boolean;
  createCategory: (category: Omit<Category, 'id'>) => Promise<{ success: boolean; data?: Category; error: string | null }>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<{ success: boolean; error: string | null }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error: string | null }>;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

function mapToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    subtype: row.subtype,
    parentId: row.parent_id ?? null,
  };
}

export function CategoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setCategories((data || []).map(mapToCategory));
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  // ✅ Only returns top-level (parent) categories - parentId is null
  const getCategoriesByType = (type: 'transaction' | 'task' | 'note') => {
    return categories.filter(cat => cat.type === type && !cat.parentId);
  };

  // ✅ Returns subcategories for a given parent
  const getSubcategories = (parentId: string) => {
    return categories.filter(cat => cat.parentId === parentId);
  };

  // ✅ Check if a category has any subcategories
  const hasSubcategories = (parentId: string) => {
    return categories.some(cat => cat.parentId === parentId);
  };

  const createCategory = async (category: Omit<Category, 'id'>) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');

      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: category.name,
          type: category.type,
          color: category.color,
          subtype: category.subtype ?? null,
          parent_id: category.parentId ?? null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const mapped = mapToCategory(data);
      setCategories(prev => [...prev, mapped]);

      return { success: true, data: mapped, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      setError(null);

      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.subtype !== undefined) dbUpdates.subtype = updates.subtype;
      if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;

      const { error: updateError } = await supabase
        .from('categories')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      setCategories(prev =>
        prev.map(cat => (cat.id === id ? { ...cat, ...updates } : cat))
      );

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // ✅ Remove category AND all its subcategories from local state
      setCategories(prev => prev.filter(cat => cat.id !== id && cat.parentId !== id));

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const refreshCategories = async () => {
    await fetchCategories();
  };

  const value = {
    categories,
    loading,
    error,
    getCategoriesByType,
    getSubcategories,
    hasSubcategories,
    createCategory,
    updateCategory,
    deleteCategory,
    refreshCategories,
  };

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  return context;
}