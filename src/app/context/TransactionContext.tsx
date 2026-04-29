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
  createTransfer: (params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description?: string;
    categoryId: string;
  }) => Promise<{ success: boolean; error: string | null }>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ success: boolean; error: string | null }>;
  updateTransfer: (id: string, updates: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description?: string;
    categoryId: string;
  }) => Promise<{ success: boolean; error: string | null }>;
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
    createdAt: row.created_at ?? null,   // ✅ map created_at dari DB
    description: row.description || '',
    attachments: row.attachments || [],
    transferPairId: row.transfer_pair_id ?? null,
    toAccountId: row.to_account_id ?? null,
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
        // ✅ Sort by date desc, lalu created_at desc sebagai tiebreaker
        // Transaksi di hari yang sama tampil berdasarkan urutan dibuat
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
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
    const unsubRestore = trashEvents.subscribeRestore((table) => {
      if (table === 'transactions') fetchTransactions();
    });
    const unsubCreated = trashEvents.subscribeTransactionCreated(() => {
      fetchTransactions();
    });
    return () => {
      unsubRestore();
      unsubCreated();
    };
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
      // ✅ Insert di posisi paling atas (paling baru)
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

  const createTransfer = async ({
    fromAccountId, toAccountId, amount, date, description, categoryId,
  }: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description?: string;
    categoryId: string;
  }) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');

      const pairId = crypto.randomUUID();

      const { data: outData, error: outError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: fromAccountId,
          category_id: categoryId,
          amount,
          type: 'transfer',
          date,
          description: description || '',
          transfer_pair_id: pairId,
          to_account_id: toAccountId,
        })
        .select()
        .single();
      if (outError) throw outError;

      const { data: inData, error: inError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: toAccountId,
          category_id: categoryId,
          amount,
          type: 'transfer',
          date,
          description: description || '',
          transfer_pair_id: pairId,
          to_account_id: null,
        })
        .select()
        .single();
      if (inError) throw inError;

      const mappedOut = mapToTransaction(outData);
      const mappedIn  = mapToTransaction(inData);
      setTransactions(prev => [mappedOut, mappedIn, ...prev]);

      updateBalanceLocally(fromAccountId, -amount);
      updateBalanceLocally(toAccountId, amount);

      return { success: true, error: null };
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
      if (updates.accountId     !== undefined) dbUpdates.account_id     = updates.accountId;
      if (updates.categoryId    !== undefined) dbUpdates.category_id    = updates.categoryId;
      if (updates.subcategoryId !== undefined) dbUpdates.subcategory_id = updates.subcategoryId ?? null;
      if (updates.amount        !== undefined) dbUpdates.amount         = updates.amount;
      if (updates.type          !== undefined) dbUpdates.type           = updates.type;
      if (updates.date          !== undefined) dbUpdates.date           = updates.date;
      if (updates.description   !== undefined) dbUpdates.description    = updates.description;
      const { error: updateError } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
      if (updateError) throw updateError;
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      if (oldTransaction && oldTransaction.type !== 'transfer') {
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

  const updateTransfer = async (id: string, updates: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description?: string;
    categoryId: string;
  }) => {
    try {
      setError(null);
      const outTx = transactions.find(t => t.id === id);
      if (!outTx || !outTx.transferPairId) throw new Error('Transfer not found');

      const inTx = transactions.find(t =>
        t.transferPairId === outTx.transferPairId && t.id !== id
      );

      updateBalanceLocally(outTx.accountId, outTx.amount);
      if (inTx) updateBalanceLocally(inTx.accountId, -inTx.amount);

      const { error: outError } = await supabase
        .from('transactions')
        .update({
          account_id: updates.fromAccountId,
          to_account_id: updates.toAccountId,
          amount: updates.amount,
          date: updates.date,
          description: updates.description || '',
          category_id: updates.categoryId,
        })
        .eq('id', id);
      if (outError) throw outError;

      if (inTx) {
        const { error: inError } = await supabase
          .from('transactions')
          .update({
            account_id: updates.toAccountId,
            amount: updates.amount,
            date: updates.date,
            description: updates.description || '',
            category_id: updates.categoryId,
          })
          .eq('id', inTx.id);
        if (inError) throw inError;
      }

      setTransactions(prev => prev.map(t => {
        if (t.id === id) return { ...t, accountId: updates.fromAccountId, toAccountId: updates.toAccountId, amount: updates.amount, date: updates.date, description: updates.description || '', categoryId: updates.categoryId };
        if (inTx && t.id === inTx.id) return { ...t, accountId: updates.toAccountId, amount: updates.amount, date: updates.date, description: updates.description || '', categoryId: updates.categoryId };
        return t;
      }));

      updateBalanceLocally(updates.fromAccountId, -updates.amount);
      updateBalanceLocally(updates.toAccountId, updates.amount);

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

      if (transaction?.type === 'transfer' && transaction.transferPairId) {
        const pairTx = transactions.find(t =>
          t.transferPairId === transaction.transferPairId && t.id !== id
        );

        const now = new Date().toISOString();
        const { error: deleteError } = await supabase
          .from('transactions')
          .update({ deleted_at: now })
          .eq('transfer_pair_id', transaction.transferPairId);
        if (deleteError) throw deleteError;

        setTransactions(prev => prev.filter(t => t.transferPairId !== transaction.transferPairId));

        if (transaction.toAccountId) {
          updateBalanceLocally(transaction.accountId, transaction.amount);
          if (pairTx) updateBalanceLocally(pairTx.accountId, -pairTx.amount);
        } else {
          updateBalanceLocally(transaction.accountId, -transaction.amount);
          if (pairTx) updateBalanceLocally(pairTx.accountId, pairTx.amount);
        }
      } else {
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

  const value = {
    transactions, loading, error,
    createTransaction, createTransfer,
    updateTransaction, updateTransfer,
    deleteTransaction, getTransactionById, refreshTransactions,
  };
  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) throw new Error('useTransactions must be used within TransactionProvider');
  return context;
}