// src/app/context/AccountContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Account } from '../types';
import { useAuth } from './AuthContext';
import { trashEvents } from '../../lib/trashEvents';

interface AccountContextType {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  createAccount: (account: Omit<Account, 'id'>) => Promise<{ success: boolean; error: string | null }>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<{ success: boolean; error: string | null }>;
  updateAccountWithAdjustment: (
    id: string,
    updates: Partial<Account>,
    oldBalance: number
  ) => Promise<{ success: boolean; error: string | null }>;
  deleteAccount: (id: string) => Promise<{ success: boolean; error: string | null }>;
  setPrimaryAccount: (id: string) => Promise<{ success: boolean; error: string | null }>;
  refreshAccounts: () => Promise<void>;
  updateBalanceLocally: (accountId: string, delta: number) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    if (!user) { setAccounts([]); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setAccounts(data || []);
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    const unsub = trashEvents.subscribeRestore((table) => {
      if (table === 'accounts') fetchAccounts();
    });
    return unsub;
  }, [user]);

  const createAccount = async (account: Omit<Account, 'id'>) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');

      // Jika ini akun pertama, otomatis jadikan primary
      const isFirst = accounts.length === 0;

      const { data, error: insertError } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          is_primary: isFirst,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Primary muncul di atas
      setAccounts(prev => isFirst ? [data, ...prev] : [...prev, data]);
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      setError(null);
      const { error: updateError } = await supabase.from('accounts').update(updates).eq('id', id);
      if (updateError) throw updateError;
      setAccounts(prev => prev.map(acc => (acc.id === id ? { ...acc, ...updates } : acc)));
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // ✅ Set akun sebagai primary — unset yang lain dulu, lalu set yang baru
  const setPrimaryAccount = async (id: string) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');

      // Unset semua primary milik user ini
      const { error: unsetError } = await supabase
        .from('accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('is_primary', true);
      if (unsetError) throw unsetError;

      // Set yang dipilih jadi primary
      const { error: setPrimaryError } = await supabase
        .from('accounts')
        .update({ is_primary: true })
        .eq('id', id);
      if (setPrimaryError) throw setPrimaryError;

      // Update local state — primary muncul di atas
      setAccounts(prev => {
        const updated = prev.map(acc => ({ ...acc, is_primary: acc.id === id }));
        return [
          ...updated.filter(a => a.is_primary),
          ...updated.filter(a => !a.is_primary),
        ];
      });

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const getAdjustmentCategoryId = async (subtype: 'income' | 'expense'): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data: others } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('type', 'transaction')
        .eq('subtype', subtype)
        .is('parent_id', null)
        .is('deleted_at', null)
        .ilike('name', '%other%')
        .limit(1);

      if (others && others.length > 0) return others[0].id;

      const { data: fallback } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'transaction')
        .eq('subtype', subtype)
        .is('parent_id', null)
        .is('deleted_at', null)
        .limit(1);

      if (fallback && fallback.length > 0) return fallback[0].id;

      return null;
    } catch {
      return null;
    }
  };

  const updateAccountWithAdjustment = async (
    id: string,
    updates: Partial<Account>,
    oldBalance: number
  ) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');

      const newBalance = updates.balance ?? oldBalance;
      const diff = newBalance - oldBalance;

      const { error: updateError } = await supabase.from('accounts').update(updates).eq('id', id);
      if (updateError) throw updateError;
      setAccounts(prev => prev.map(acc => (acc.id === id ? { ...acc, ...updates } : acc)));

      if (diff !== 0) {
        const type = diff > 0 ? 'income' : 'expense';
        const amount = Math.abs(diff);
        const categoryId = await getAdjustmentCategoryId(type);

        if (categoryId) {
          await supabase.from('transactions').insert({
            user_id: user.id,
            account_id: id,
            category_id: categoryId,
            amount,
            type,
            date: new Date().toISOString().split('T')[0],
            description: `Balance adjustment (${diff > 0 ? '+' : '-'}${amount.toLocaleString('id-ID')})`,
          });
          trashEvents.emitTransactionCreated();
        }
      }

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      setError(null);
      const accountToDelete = accounts.find(a => a.id === id);
      const { error: deleteError } = await supabase
        .from('accounts')
        .update({ deleted_at: new Date().toISOString(), is_primary: false })
        .eq('id', id);
      if (deleteError) throw deleteError;

      const remaining = accounts.filter(acc => acc.id !== id);
      setAccounts(remaining);

      // Jika yang dihapus adalah primary, otomatis set akun pertama yang tersisa jadi primary
      if (accountToDelete?.is_primary && remaining.length > 0) {
        await setPrimaryAccount(remaining[0].id);
      }

      trashEvents.emit();
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const refreshAccounts = async () => { await fetchAccounts(); };

  const updateBalanceLocally = (accountId: string, delta: number) => {
    setAccounts(prev =>
      prev.map(acc => acc.id === accountId ? { ...acc, balance: acc.balance + delta } : acc)
    );
  };

  const value = {
    accounts, loading, error,
    createAccount, updateAccount, updateAccountWithAdjustment,
    deleteAccount, setPrimaryAccount, refreshAccounts, updateBalanceLocally,
  };
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccounts() {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccounts must be used within AccountProvider');
  return context;
}