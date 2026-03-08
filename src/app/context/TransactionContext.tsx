// src/app/context/TransactionContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Transaction } from '../types';
import { useAuth } from './AuthContext';
import { useAccounts } from './AccountContext';

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
    amount: row.amount,
    type: row.type,
    date: row.date,
    description: row.description || '',
    attachments: row.attachments || [],
  };
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // ✅ FIX: Ambil updateBalanceLocally dari AccountContext
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
        .order('date', { ascending: false });
      if (fetchError) throw fetchError;
      setTransactions((data || []).map(mapToTransaction));
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [user]);

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

      // ✅ FIX: Update balance account secara lokal (tanpa refresh)
      // income → tambah saldo, expense → kurangi saldo
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

      // Ambil transaksi lama untuk rollback balance
      const oldTransaction = transactions.find(t => t.id === id);

      const dbUpdates: any = {};
      if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.description !== undefined) dbUpdates.description = updates.description;

      const { error: updateError } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
      if (updateError) throw updateError;

      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

      // ✅ FIX: Rollback balance lama lalu apply balance baru
      if (oldTransaction) {
        // Rollback transaksi lama
        const oldDelta = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
        updateBalanceLocally(oldTransaction.accountId, oldDelta);

        // Apply transaksi baru
        const newAccountId = updates.accountId ?? oldTransaction.accountId;
        const newAmount = updates.amount ?? oldTransaction.amount;
        const newType = updates.type ?? oldTransaction.type;
        const newDelta = newType === 'income' ? newAmount : -newAmount;
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

      // Ambil transaksi yang akan dihapus untuk rollback balance
      const transaction = transactions.find(t => t.id === id);

      const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id);
      if (deleteError) throw deleteError;

      setTransactions(prev => prev.filter(t => t.id !== id));

      // ✅ FIX: Rollback balance saat transaksi dihapus
      if (transaction) {
        const delta = transaction.type === 'income' ? -transaction.amount : transaction.amount;
        updateBalanceLocally(transaction.accountId, delta);
      }

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