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

  const setPrimaryAccount = async (id: string) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');

      const { error: unsetError } = await supabase
        .from('accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('is_primary', true);
      if (unsetError) throw unsetError;

      const { error: setPrimaryError } = await supabase
        .from('accounts')
        .update({ is_primary: true })
        .eq('id', id);
      if (setPrimaryError) throw setPrimaryError;

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

      // ✅ FIX: newBalance adalah nilai ABSOLUT yang diinginkan user (misal 50.000)
      // bukan hasil kalkulasi — pastikan kita pakai nilai ini langsung ke DB
      const newBalance = updates.balance ?? oldBalance;

      // ✅ diff hanya untuk menentukan amount & type transaksi adjustment
      // diff = 50.000 - 99.000 = -49.000 → expense 49.000
      const diff = newBalance - oldBalance;

      // ✅ Step 1: Set balance account langsung ke newBalance di DB
      const { error: updateError } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id);
      if (updateError) throw updateError;

      // ✅ Step 2: Update local state langsung ke nilai absolut (bukan delta)
      // Ini mencegah double-hit dari updateBalanceLocally
      setAccounts(prev => prev.map(acc => (acc.id === id ? { ...acc, ...updates } : acc)));

      // ✅ Step 3: Catat transaksi adjustment sebesar Math.abs(diff)
      // Transaksi ini HANYA sebagai catatan historis — balance sudah di-set di Step 1
      // Kita INSERT langsung ke Supabase tanpa memanggil createTransaction()
      // agar tidak ada updateBalanceLocally yang ikut jalan
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
            description: `Balance adjustment (${oldBalance.toLocaleString('id-ID')} → ${newBalance.toLocaleString('id-ID')})`,
          });

          // ✅ Emit event agar TransactionContext refresh daftar transaksi
          // tapi JANGAN panggil updateBalanceLocally — balance sudah benar di Step 2
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