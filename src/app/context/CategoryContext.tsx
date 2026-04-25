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
  getCategoriesByType: (type: 'transaction' | 'task' | 'note') => Category[];
  getCategoriesBySubtype: (subtype: 'income' | 'expense') => Category[];
  getSubcategories: (parentId: string) => Category[];
  hasSubcategories: (parentId: string) => boolean;
  getEffectiveCategoryName: (categoryId: string, subcategoryId?: string | null) => string;
  getEffectiveCategoryColor: (categoryId: string, subcategoryId?: string | null) => string;
  createCategory: (category: Omit<Category, 'id'>) => Promise<{ success: boolean; data?: Category; error: string | null }>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<{ success: boolean; error: string | null }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error: string | null }>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
  // ✅ Reset urutan kategori ke default (created_at asc) per type atau per parent
  resetCategoryOrder: (type: 'transaction' | 'task' | 'note', parentId?: string) => Promise<{ success: boolean; error: string | null }>;
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
    sortOrder: row.sort_order ?? 0,
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
        .neq('is_system', true)
        .order('sort_order', { ascending: true });
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

  const getCategoriesByType = (type: 'transaction' | 'task' | 'note') =>
    categories.filter(cat => cat.type === type && !cat.parentId);

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

  const getEffectiveCategoryColor = (categoryId: string, subcategoryId?: string | null): string => {
    if (subcategoryId) {
      const sub = categories.find(c => c.id === subcategoryId);
      if (sub?.color) return sub.color;
      const parent = categories.find(c => c.id === sub?.parentId);
      if (parent?.color) return parent.color;
    }
    return categories.find(c => c.id === categoryId)?.color ?? '#6b7280';
  };

  const createCategory = async (category: Omit<Category, 'id'>) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');
      const siblings = categories.filter(c =>
        c.type === category.type &&
        (category.parentId ? c.parentId === category.parentId : !c.parentId)
      );
      const maxOrder = siblings.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), 0);
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: category.name,
          type: category.type,
          color: category.color,
          subtype: category.subtype ?? null,
          parent_id: category.parentId ?? null,
          sort_order: maxOrder + 1,
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
      if (updates.name      !== undefined) dbUpdates.name       = updates.name;
      if (updates.color     !== undefined) dbUpdates.color      = updates.color;
      if (updates.subtype   !== undefined) dbUpdates.subtype    = updates.subtype;
      if (updates.parentId  !== undefined) dbUpdates.parent_id  = updates.parentId;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      const { error: updateError } = await supabase
        .from('categories')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user!.id);
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
        .eq('id', id)
        .eq('user_id', user!.id);
      if (deleteError) throw deleteError;
      await supabase.from('categories').update({ deleted_at: now }).eq('parent_id', id).eq('user_id', user!.id);
      setCategories(prev => prev.filter(cat => cat.id !== id && cat.parentId !== id));
      trashEvents.emit();
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const reorderCategories = async (orderedIds: string[]) => {
    if (!user) return;
    setCategories(prev => {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i + 1]));
      return prev
        .map(cat => orderMap.has(cat.id) ? { ...cat, sortOrder: orderMap.get(cat.id)! } : cat)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    });
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase
        .from('categories')
        .update({ sort_order: i + 1 })
        .eq('id', orderedIds[i])
        .eq('user_id', user.id);
    }
  };

  // ✅ Reset urutan ke default (created_at asc) via RPC
  const resetCategoryOrder = async (type: 'transaction' | 'task' | 'note', parentId?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const { error: rpcError } = await supabase.rpc('reset_category_order', {
        p_user_id: user.id,
        p_type: type,
        p_parent_id: parentId ?? null,
      });
      if (rpcError) throw rpcError;
      // Refresh dari DB agar state sinkron
      await fetchCategories();
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      return { success: false, error: errorMessage };
    }
  };

  const refreshCategories = async () => { await fetchCategories(); };

  const value = {
    categories, loading, error,
    getCategoriesByType, getCategoriesBySubtype,
    getSubcategories, hasSubcategories,
    getEffectiveCategoryName, getEffectiveCategoryColor,
    createCategory, updateCategory, deleteCategory,
    reorderCategories, resetCategoryOrder, refreshCategories,
  };
  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) throw new Error('useCategories must be used within CategoryProvider');
  return context;
}