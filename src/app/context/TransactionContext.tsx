// src/app/context/TransactionContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { Transaction } from '../types';
import { useAuth } from './AuthContext';

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

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      setTransactions(data || []);
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when user changes
  useEffect(() => {
    fetchTransactions();
  }, [user]);

  // Get transaction by ID
  const getTransactionById = (id: string) => {
    return transactions.find(t => t.id === id);
  };

  // Create transaction
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

      // Add to local state
      setTransactions(prev => [data, ...prev]);

      return { success: true, data, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update transaction
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      setError(null);

      // Prepare update object (convert camelCase to snake_case for DB)
      const dbUpdates: any = {};
      if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.description !== undefined) dbUpdates.description = updates.description;

      const { error: updateError } = await supabase
        .from('transactions')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setTransactions(prev =>
        prev.map(t => (t.id === id ? { ...t, ...updates } : t))
      );

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setTransactions(prev => prev.filter(t => t.id !== id));

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Refresh transactions
  const refreshTransactions = async () => {
    await fetchTransactions();
  };

  const value = {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionById,
    refreshTransactions,
  };

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within TransactionProvider');
  }
  return context;
}