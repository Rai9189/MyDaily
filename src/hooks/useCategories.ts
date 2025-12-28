import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as categoryService from '../services/categoryService';
import type { Database } from '../types/database.types';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

/**
 * Custom Hook untuk Categories Management
 */
export function useCategories(type?: 'transaction' | 'task' | 'note') {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch categories
   */
  const fetchCategories = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getCategories(user.id, type);
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [user, type]);

  /**
   * Create new category
   */
  const addCategory = async (
    categoryData: Omit<CategoryInsert, 'user_id' | 'id'>
  ): Promise<CategoryRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const newCategory = await categoryService.createCategory(user.id, categoryData);
      setCategories((prev) => [newCategory, ...prev]);
      return newCategory;
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding category:', err);
      return null;
    }
  };

  /**
   * Update category
   */
  const editCategory = async (
    categoryId: string,
    updates: CategoryUpdate
  ): Promise<CategoryRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const updatedCategory = await categoryService.updateCategory(
        user.id,
        categoryId,
        updates
      );
      setCategories((prev) =>
        prev.map((cat) => (cat.id === categoryId ? updatedCategory : cat))
      );
      return updatedCategory;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating category:', err);
      return null;
    }
  };

  /**
   * Delete category
   */
  const removeCategory = async (categoryId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      await categoryService.deleteCategory(user.id, categoryId);
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting category:', err);
      return false;
    }
  };

  /**
   * Get category by ID
   */
  const getCategoryById = useCallback(
    (categoryId: string): CategoryRow | undefined => {
      return categories.find((cat) => cat.id === categoryId);
    },
    [categories]
  );

  /**
   * Get category by type
   */
  const getCategoriesByType = useCallback(
    (categoryType: 'transaction' | 'task' | 'note'): CategoryRow[] => {
      return categories.filter((cat) => cat.type === categoryType);
    },
    [categories]
  );

  // Fetch categories saat component mount atau user berubah
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    addCategory,
    editCategory,
    removeCategory,
    getCategoryById,
    getCategoriesByType,
  };
}