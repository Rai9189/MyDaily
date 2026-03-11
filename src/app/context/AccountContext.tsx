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
  deleteAccount: (id: string) => Promise<{ success: boolean; error: string | null }>;
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
      const { data, error: insertError } = await supabase
        .from('accounts')
        .insert({ user_id: user.id, name: account.name, type: account.type, balance: account.balance })
        .select()
        .single();
      if (insertError) throw insertError;
      setAccounts(prev => [data, ...prev]);
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

  const deleteAccount = async (id: string) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (deleteError) throw deleteError;
      setAccounts(prev => prev.filter(acc => acc.id !== id));
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

  const value = { accounts, loading, error, createAccount, updateAccount, deleteAccount, refreshAccounts, updateBalanceLocally };
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccounts() {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccounts must be used within AccountProvider');
  return context;
}