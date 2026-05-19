// src/app/hooks/useTransactionTemplates.ts
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface TransactionTemplate {
  id: string;
  name: string;
  accountId: string | null;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string | null;
  subcategoryId?: string | null;
  description?: string;
  createdAt: string;
}

const MAX_TEMPLATES = 10;

function mapTemplate(row: any): TransactionTemplate {
  return {
    id:            row.id,
    name:          row.name,
    accountId:     row.account_id ?? null,
    type:          row.type,
    amount:        row.amount,
    categoryId:    row.category_id ?? null,
    subcategoryId: row.subcategory_id ?? null,
    description:   row.description ?? '',
    createdAt:     row.created_at,
  };
}

export function useTransactionTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setTemplates([]); return; }
    setLoading(true);
    supabase
      .from('transaction_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn('Failed to load templates:', error.message);
        setTemplates((data || []).map(mapTemplate));
        setLoading(false);
      });
  }, [user?.id]);

  const saveTemplate = useCallback(async (
    name: string,
    data: Omit<TransactionTemplate, 'id' | 'createdAt' | 'name'>
  ): Promise<TransactionTemplate | null> => {
    if (!user) return null;

    const { data: inserted, error } = await supabase
      .from('transaction_templates')
      .insert({
        user_id:        user.id,
        name,
        account_id:     data.accountId    || null,
        type:           data.type,
        amount:         data.amount,
        category_id:    data.categoryId   || null,
        subcategory_id: data.subcategoryId || null,
        description:    data.description  || null,
      })
      .select()
      .single();

    if (error || !inserted) return null;

    const mapped = mapTemplate(inserted);

    // Cek apakah perlu prune sebelum update state
    const toDelete = [mapped, ...templates].slice(MAX_TEMPLATES);
    if (toDelete.length > 0) {
      Promise.all(
        toDelete.map(t => supabase.from('transaction_templates').delete().eq('id', t.id))
      ).catch(err => console.warn('Failed to prune old templates:', err));
    }

    setTemplates(prev => [mapped, ...prev].slice(0, MAX_TEMPLATES));
    return mapped;
  }, [user]);

  const deleteTemplate = useCallback(async (id: string) => {
    await supabase.from('transaction_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  return { templates, loading, saveTemplate, deleteTemplate };
}
