// src/app/context/CategoryContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Category } from '../types';
import { useAuth } from './AuthContext';
import { trashEvents } from '../../lib/trashEvents';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  // Returns only parent categories (no subcategories) — used for display grouping
  getCategoriesByType: (type: 'transaction' | 'task' | 'note') => Category[];
  // Returns parent + their subcategories for a given subtype — used in dropdowns
  getCategoriesBySubtype: (subtype: 'income' | 'expense') => Category[];
  getSubcategories: (parentId: string) => Category[];
  hasSubcategories: (parentId: string) => boolean;
  // Returns the best display name: subcategory name if subcategoryId exists, else category name
  getEffectiveCategoryName: (categoryId: string, subcategoryId?: string | null) => string;
  // Returns the best display color
  getEffectiveCategoryColor: (categoryId: string, subcategoryId?: string | null) => string;
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
    if (!user) { setCategories([]); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
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
    const unsub = trashEvents.subscribeRestore((table) => {
      if (table === 'categories') fetchCategories();
    });
    return unsub;
  }, [user]);

  // ── Only parent categories (for display/grouping) ──
  const getCategoriesByType = (type: 'transaction' | 'task' | 'note') =>
    categories.filter(cat => cat.type === type && !cat.parentId);

  // ── Fix #3: Parent + subcategories for a given subtype ──
  // Subcategories inherit subtype from their parent, so we:
  // 1. Find all parents matching the subtype
  // 2. Also include their subcategories
  const getCategoriesBySubtype = (subtype: 'income' | 'expense') => {
    const parents = categories.filter(cat =>
      cat.type === 'transaction' && !cat.parentId && cat.subtype === subtype
    );
    const parentIds = new Set(parents.map(p => p.id));
    const subs = categories.filter(cat =>
      cat.type === 'transaction' && cat.parentId != null && parentIds.has(cat.parentId)
    );
    return [...parents, ...subs];
  };

  const getSubcategories = (parentId: string) =>
    categories.filter(cat => cat.parentId === parentId);

  const hasSubcategories = (parentId: string) =>
    categories.some(cat => cat.parentId === parentId);

  // ── Fix #2: Effective category name for list/card display ──
  // If subcategoryId exists → show "ParentName / SubName"
  // Otherwise → show parent category name
  const getEffectiveCategoryName = (categoryId: string, subcategoryId?: string | null): string => {
    if (subcategoryId) {
      const sub = categories.find(c => c.id === subcategoryId);
      if (sub) {
        const parent = categories.find(c => c.id === sub.parentId);
        return parent ? `${parent.name} / ${sub.name}` : sub.name;
      }
    }
    return categories.find(c => c.id === categoryId)?.name ?? 'Other';
  };

  // ── Effective color: prefer subcategory color, fallback to parent ──
  const getEffectiveCategoryColor = (categoryId: string, subcategoryId?: string | null): string => {
    if (subcategoryId) {
      const sub = categories.find(c => c.id === subcategoryId);
      if (sub?.color) return sub.color;
      // fallback to parent color
      const parent = categories.find(c => c.id === sub?.parentId);
      if (parent?.color) return parent.color;
    }
    return categories.find(c => c.id === categoryId)?.color ?? '#6b7280';
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
      if (updates.name     !== undefined) dbUpdates.name      = updates.name;
      if (updates.color    !== undefined) dbUpdates.color     = updates.color;
      if (updates.subtype  !== undefined) dbUpdates.subtype   = updates.subtype;
      if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;
      const { error: updateError } = await supabase.from('categories').update(dbUpdates).eq('id', id);
      if (updateError) throw updateError;
      setCategories(prev => prev.map(cat => (cat.id === id ? { ...cat, ...updates } : cat)));
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
      const now = new Date().toISOString();
      const { error: deleteError } = await supabase
        .from('categories')
        .update({ deleted_at: now })
        .eq('id', id);
      if (deleteError) throw deleteError;
      await supabase.from('categories').update({ deleted_at: now }).eq('parent_id', id);
      setCategories(prev => prev.filter(cat => cat.id !== id && cat.parentId !== id));
      trashEvents.emit();
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const refreshCategories = async () => { await fetchCategories(); };

  const value = {
    categories, loading, error,
    getCategoriesByType, getCategoriesBySubtype,
    getSubcategories, hasSubcategories,
    getEffectiveCategoryName, getEffectiveCategoryColor,
    createCategory, updateCategory, deleteCategory, refreshCategories,
  };
  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) throw new Error('useCategories must be used within CategoryProvider');
  return context;
}