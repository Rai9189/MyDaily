// src/app/context/TransactionContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Transaction } from '../types';
import { useAuth } from './AuthContext';
import { useAccounts } from './AccountContext';
import { trashEvents } from '../../lib/trashEvents';

interface TransactionContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  createTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<{ success: boolean; data?: Transaction; error: string | null }>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ success: boolean; error: string | null }>;
  deleteTransaction: (id: string) => Promise<{ success: boolean; error: string | null }>;
  getTransactionById: (id: string) => Transaction | undefined;
  refreshTransactions: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

function mapToTransaction(row: any): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? null,
    amount: row.amount,
    type: row.type,
    date: row.date,
    description: row.description || '',
    attachments: row.attachments || [],
  };
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { updateBalanceLocally } = useAccounts();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    if (!user) { setTransactions([]); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('date', { ascending: false });
      if (fetchError) throw fetchError;
      setTransactions((data || []).map(mapToTransaction));
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const unsub = trashEvents.subscribeRestore((table) => {
      if (table === 'transactions') fetchTransactions();
    });
    return unsub;
  }, [user]);

  const getTransactionById = (id: string) => transactions.find(t => t.id === id);

  const createTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: transaction.accountId,
          category_id: transaction.categoryId,
          subcategory_id: transaction.subcategoryId ?? null,
          amount: transaction.amount,
          type: transaction.type,
          date: transaction.date,
          description: transaction.description,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      const mapped = mapToTransaction(data);
      setTransactions(prev => [mapped, ...prev]);
      const delta = transaction.type === 'income' ? transaction.amount : -transaction.amount;
      updateBalanceLocally(transaction.accountId, delta);
      return { success: true, data: mapped, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      setError(null);
      if (!id || id === 'new') throw new Error('Invalid transaction ID');
      const oldTransaction = transactions.find(t => t.id === id);
      const dbUpdates: any = {};
      if (updates.accountId    !== undefined) dbUpdates.account_id     = updates.accountId;
      if (updates.categoryId   !== undefined) dbUpdates.category_id    = updates.categoryId;
      if (updates.subcategoryId !== undefined) dbUpdates.subcategory_id = updates.subcategoryId ?? null;
      if (updates.amount       !== undefined) dbUpdates.amount         = updates.amount;
      if (updates.type         !== undefined) dbUpdates.type           = updates.type;
      if (updates.date         !== undefined) dbUpdates.date           = updates.date;
      if (updates.description  !== undefined) dbUpdates.description    = updates.description;
      const { error: updateError } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
      if (updateError) throw updateError;
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      if (oldTransaction) {
        const oldDelta = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
        updateBalanceLocally(oldTransaction.accountId, oldDelta);
        const newAccountId = updates.accountId ?? oldTransaction.accountId;
        const newAmount    = updates.amount    ?? oldTransaction.amount;
        const newType      = updates.type      ?? oldTransaction.type;
        const newDelta     = newType === 'income' ? newAmount : -newAmount;
        updateBalanceLocally(newAccountId, newDelta);
      }
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      setError(null);
      const transaction = transactions.find(t => t.id === id);
      const { error: deleteError } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (deleteError) throw deleteError;
      setTransactions(prev => prev.filter(t => t.id !== id));
      if (transaction) {
        const delta = transaction.type === 'income' ? -transaction.amount : transaction.amount;
        updateBalanceLocally(transaction.accountId, delta);
      }
      trashEvents.emit();
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const refreshTransactions = async () => { await fetchTransactions(); };

  const value = { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction, getTransactionById, refreshTransactions };
  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) throw new Error('useTransactions must be used within TransactionProvider');
  return context;
}