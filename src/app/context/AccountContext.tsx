// src/app/context/AccountContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { withErrorHandling, withErrorHandlingNoData } from '../../lib/errorHandler';
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

  // Silent refresh — dipakai oleh TransactionContext agar tidak ada loading flash
  const fetchAccountsSilent = async () => {
    if (!user) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (!fetchError) setAccounts(data || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchAccounts();
    const unsub = trashEvents.subscribeRestore((table) => {
      if (table === 'accounts') fetchAccounts();
    });
    return unsub;
  }, [user]);

  const createAccount = async (account: Omit<Account, 'id'>) => {
    if (!user) {
      const errorMessage = 'User not authenticated';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setError(null);
    const isFirst = accounts.length === 0;

    return withErrorHandling(
      () => supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          is_primary: isFirst,
        })
        .select()
        .single(),
      { setError }
    ).then(result => {
      if (result.success && result.data) {
        setAccounts(prev => isFirst ? [result.data, ...prev] : [...prev, result.data]);
      }
      return { success: result.success, error: result.error };
    });
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    if (!user) {
      const errorMessage = 'User not authenticated';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setError(null);
    return withErrorHandlingNoData(
      () => supabase.from('accounts').update(updates).eq('id', id).eq('user_id', user.id),
      { setError }
    ).then(result => {
      if (result.success) {
        setAccounts(prev => prev.map(acc => (acc.id === id ? { ...acc, ...updates } : acc)));
      }
      return result;
    });
  };

  const setPrimaryAccount = async (id: string) => {
    if (!user) {
      const errorMessage = 'User not authenticated';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setError(null);
    try {
      await withErrorHandlingNoData(
        () => supabase
          .from('accounts')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .eq('is_primary', true),
        { setError }
      );

      const result = await withErrorHandlingNoData(
        () => supabase
          .from('accounts')
          .update({ is_primary: true })
          .eq('id', id),
        { setError }
      );

      if (result.success) {
        setAccounts(prev => {
          const updated = prev.map(acc => ({ ...acc, is_primary: acc.id === id }));
          return [
            ...updated.filter(a => a.is_primary),
            ...updated.filter(a => !a.is_primary),
          ];
        });
      }

      return result;
    } catch (err) {
      const errorMessage = 'Failed to set primary account';
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
    if (!user) {
      const errorMessage = 'User not authenticated';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setError(null);
    try {
      const newBalance = updates.balance ?? oldBalance;
      const diff = newBalance - oldBalance;

      const { balance: _ignored, ...nonBalanceUpdates } = updates as any;
      if (Object.keys(nonBalanceUpdates).length > 0) {
        await withErrorHandlingNoData(
          () => supabase
            .from('accounts')
            .update(nonBalanceUpdates)
            .eq('id', id),
          { setError }
        );
        setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...nonBalanceUpdates } : acc));
      }

      if (diff !== 0) {
        const type = diff > 0 ? 'income' : 'expense';
        const amount = Math.abs(diff);
        const categoryId = await getAdjustmentCategoryId(type);

        if (categoryId) {
          await withErrorHandling(
            () => supabase.from('transactions').insert({
              user_id: user.id,
              account_id: id,
              category_id: categoryId,
              amount,
              type,
              date: new Date().toISOString().split('T')[0],
              description: `Balance adjustment (${oldBalance.toLocaleString('id-ID')} → ${newBalance.toLocaleString('id-ID')})`,
            }),
            { setError }
          );
          trashEvents.emitTransactionCreated();
        } else {
          await withErrorHandlingNoData(
            () => supabase
              .from('accounts')
              .update({ balance: newBalance })
              .eq('id', id),
            { setError }
          );
        }
      }

      await fetchAccountsSilent();
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = 'Failed to update account';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteAccount = async (id: string) => {
    if (!user) {
      const errorMessage = 'User not authenticated';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setError(null);
    const accountToDelete = accounts.find(a => a.id === id);

    const result = await withErrorHandlingNoData(
      () => supabase
        .from('accounts')
        .update({ deleted_at: new Date().toISOString(), is_primary: false })
        .eq('id', id)
        .eq('user_id', user.id),
      { setError }
    );

    if (result.success) {
      const remaining = accounts.filter(acc => acc.id !== id);
      setAccounts(remaining);

      if (accountToDelete?.is_primary && remaining.length > 0) {
        await setPrimaryAccount(remaining[0].id);
      }

      trashEvents.emit();
    }

    return result;
  };

  const refreshAccounts = async () => { await fetchAccountsSilent(); };

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