// src/app/context/CategoryContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Category } from '../types';
import { useAuth } from './AuthContext';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  getCategoriesByType: (type: 'transaction' | 'task' | 'note') => Category[];
  createCategory: (category: Omit<Category, 'id'>) => Promise<{ success: boolean; error: string | null }>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<{ success: boolean; error: string | null }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error: string | null }>;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
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
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCategories(data || []);
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when user changes
  useEffect(() => {
    fetchCategories();
  }, [user]);

  // Get categories by type
  const getCategoriesByType = (type: 'transaction' | 'task' | 'note') => {
    return categories.filter(cat => cat.type === type);
  };

  // Create category
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
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state
      setCategories(prev => [data, ...prev]);

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update category
  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
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

  // Delete category
  const deleteCategory = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setCategories(prev => prev.filter(cat => cat.id !== id));

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Refresh categories
  const refreshCategories = async () => {
    await fetchCategories();
  };

  const value = {
    categories,
    loading,
    error,
    getCategoriesByType,
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