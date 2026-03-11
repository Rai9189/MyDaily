// src/app/context/TrashContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { trashEvents } from '../../lib/trashEvents';

export interface TrashItem {
  id: string;
  table: 'transactions' | 'tasks' | 'notes' | 'categories' | 'accounts';
  name: string;
  description?: string;
  deleted_at: string;
  meta?: Record<string, any>;
}

interface TrashContextType {
  trashItems: TrashItem[];
  loading: boolean;
  error: string | null;
  restoreItem: (item: TrashItem) => Promise<{ success: boolean; error: string | null }>;
  hardDeleteItem: (item: TrashItem) => Promise<{ success: boolean; error: string | null }>;
  hardDeleteAll: () => Promise<{ success: boolean; error: string | null }>;
  refresh: () => Promise<void>;
}

const TrashContext = createContext<TrashContextType | undefined>(undefined);

export function TrashProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrash = async () => {
    if (!user) { setTrashItems([]); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);

      const [transactions, tasks, notes, categories, accounts] = await Promise.all([
        supabase.from('transactions').select('id, amount, type, date, description, deleted_at, account_id').eq('user_id', user.id).not('deleted_at', 'is', null),
        supabase.from('tasks').select('id, title, description, deadline, deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
        supabase.from('notes').select('id, title, content, deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
        supabase.from('categories').select('id, name, type, color, deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
        supabase.from('accounts').select('id, name, type, balance, deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
      ]);

      const items: TrashItem[] = [];

      (transactions.data || []).forEach(t => items.push({
        id: t.id, table: 'transactions',
        name: `${t.type === 'income' ? '+' : '-'} ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(t.amount)}`,
        description: t.description || t.date,
        deleted_at: t.deleted_at,
        meta: { amount: t.amount, type: t.type, date: t.date, account_id: t.account_id },
      }));

      (tasks.data || []).forEach(t => items.push({
        id: t.id, table: 'tasks',
        name: t.title,
        description: `Deadline: ${new Date(t.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        deleted_at: t.deleted_at,
        meta: { deadline: t.deadline },
      }));

      (notes.data || []).forEach(n => items.push({
        id: n.id, table: 'notes',
        name: n.title,
        description: n.content?.slice(0, 60) + (n.content?.length > 60 ? '...' : ''),
        deleted_at: n.deleted_at,
      }));

      (categories.data || []).forEach(c => items.push({
        id: c.id, table: 'categories',
        name: c.name,
        description: `${c.type} category`,
        deleted_at: c.deleted_at,
        meta: { color: c.color, type: c.type },
      }));

      (accounts.data || []).forEach(a => items.push({
        id: a.id, table: 'accounts',
        name: a.name,
        description: `${a.type} · ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(a.balance)}`,
        deleted_at: a.deleted_at,
        meta: { type: a.type, balance: a.balance },
      }));

      items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
      setTrashItems(items);
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
    const unsubDelete = trashEvents.subscribe(() => fetchTrash());
    return unsubDelete;
  }, [user]);

  const restoreItem = async (item: TrashItem) => {
    try {
      const { error } = await supabase
        .from(item.table)
        .update({ deleted_at: null })
        .eq('id', item.id);
      if (error) throw error;
      // Hapus dari local state trash
      setTrashItems(prev => prev.filter(i => i.id !== item.id));
      // Notify context yang sesuai untuk refresh datanya
      trashEvents.emitRestore(item.table);
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: handleSupabaseError(err) };
    }
  };

  const hardDeleteItem = async (item: TrashItem) => {
    try {
      const { error } = await supabase.from(item.table).delete().eq('id', item.id);
      if (error) throw error;
      setTrashItems(prev => prev.filter(i => i.id !== item.id));
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: handleSupabaseError(err) };
    }
  };

  const hardDeleteAll = async () => {
    try {
      await Promise.all([
        supabase.from('transactions').delete().eq('user_id', user!.id).not('deleted_at', 'is', null),
        supabase.from('tasks').delete().eq('user_id', user!.id).not('deleted_at', 'is', null),
        supabase.from('notes').delete().eq('user_id', user!.id).not('deleted_at', 'is', null),
        supabase.from('categories').delete().eq('user_id', user!.id).not('deleted_at', 'is', null),
        supabase.from('accounts').delete().eq('user_id', user!.id).not('deleted_at', 'is', null),
      ]);
      setTrashItems([]);
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: handleSupabaseError(err) };
    }
  };

  return (
    <TrashContext.Provider value={{ trashItems, loading, error, restoreItem, hardDeleteItem, hardDeleteAll, refresh: fetchTrash }}>
      {children}
    </TrashContext.Provider>
  );
}

export function useTrash() {
  const ctx = useContext(TrashContext);
  if (!ctx) throw new Error('useTrash must be used within TrashProvider');
  return ctx;
}