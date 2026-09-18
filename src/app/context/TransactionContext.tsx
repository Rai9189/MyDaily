// src/app/context/TransactionContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { withErrorHandling, withErrorHandlingNoData } from '../../lib/errorHandler';
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
    createdAt: row.created_at ?? null,
    description: row.description || '',
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    transferPairId: row.transfer_pair_id ?? null,
    toAccountId: row.to_account_id ?? null,
  };
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // ✅ Hanya ambil refreshAccounts — tidak ada lagi manual balance update
  const { refreshAccounts, updateBalanceLocally } = useAccounts();
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

  // ============================================================
  // CREATE TRANSACTION
  // ✅ Trigger DB otomatis update balance di Supabase.
  //    Kita cukup refresh accounts untuk sync local state.
  // ============================================================
  const createTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    setError(null);
    if (!user) {
      const msg = 'User not authenticated';
      setError(msg);
      return { success: false, error: msg };
    }
    return withErrorHandling(
      () => supabase
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
        .single(),
      { setError }
    ).then(async result => {
      if (result.success && result.data) {
        const mapped = mapToTransaction(result.data);
        setTransactions(prev => [mapped, ...prev]);
        await refreshAccounts();
        return { success: true, data: mapped, error: null };
      }
      return { success: false, error: result.error };
    });
  };

  // ============================================================
  // CREATE TRANSFER
  // ✅ Optimistic update dulu untuk feedback instan,
  //    lalu refreshAccounts() untuk sinkronisasi nilai dari DB.
  // ============================================================
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
    setError(null);
    let insertedOutId: string | null = null;
    if (!user) {
      const msg = 'User not authenticated';
      setError(msg);
      return { success: false, error: msg };
    }
    if (fromAccountId === toAccountId) {
      const msg = 'Source and destination accounts must be different.';
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      updateBalanceLocally(fromAccountId, -amount);
      updateBalanceLocally(toAccountId, +amount);

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
      insertedOutId = outData.id;

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

      await refreshAccounts();

      return { success: true, error: null };
    } catch (err) {
      if (insertedOutId) {
        await supabase.from('transactions').delete().eq('id', insertedOutId);
      }
      await refreshAccounts();
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // ============================================================
  // UPDATE TRANSACTION
  // ✅ FIX UTAMA: Hapus semua manual balance update.
  //    Trigger DB (Case 3: normal edit) sudah rollback old
  //    dan apply new secara otomatis saat UPDATE di tabel transactions.
  //    Kita cukup refresh accounts setelah update berhasil.
  // ============================================================
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    setError(null);
    if (!id || id === 'new') {
      const msg = 'Invalid transaction ID';
      setError(msg);
      return { success: false, error: msg };
    }

    const dbUpdates: any = {};
    if (updates.accountId     !== undefined) dbUpdates.account_id     = updates.accountId;
    if (updates.categoryId    !== undefined) dbUpdates.category_id    = updates.categoryId;
    if (updates.subcategoryId !== undefined) dbUpdates.subcategory_id = updates.subcategoryId ?? null;
    if (updates.amount        !== undefined) dbUpdates.amount         = updates.amount;
    if (updates.type          !== undefined) dbUpdates.type           = updates.type;
    if (updates.date          !== undefined) dbUpdates.date           = updates.date;
    if (updates.description   !== undefined) dbUpdates.description    = updates.description;

    return withErrorHandlingNoData(
      () => supabase.from('transactions').update(dbUpdates).eq('id', id),
      { setError }
    ).then(async result => {
      if (result.success) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        await refreshAccounts();
      }
      return result;
    });
  };

  // ============================================================
  // UPDATE TRANSFER
  // ✅ FIX: Hapus semua manual supabase accounts update
  //    dan manual updateBalanceLocally.
  //    Trigger DB handle balance saat UPDATE kedua transaksi.
  // ============================================================
  const updateTransfer = async (id: string, updates: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description?: string;
    categoryId: string;
  }) => {
    setError(null);
    const outTx = transactions.find(t => t.id === id);
    if (!outTx || !outTx.transferPairId) {
      const msg = 'Transfer not found';
      setError(msg);
      return { success: false, error: msg };
    }

    const inTx = transactions.find(t =>
      t.transferPairId === outTx.transferPairId && t.id !== id
    );

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
    if (outError) {
      setError(handleSupabaseError(outError));
      return { success: false, error: handleSupabaseError(outError) };
    }

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
      if (inError) {
        setError(handleSupabaseError(inError));
        return { success: false, error: handleSupabaseError(inError) };
      }
    }

    setTransactions(prev => prev.map(t => {
      if (t.id === id) return {
        ...t,
        accountId: updates.fromAccountId,
        toAccountId: updates.toAccountId,
        amount: updates.amount,
        date: updates.date,
        description: updates.description || '',
        categoryId: updates.categoryId,
      };
      if (inTx && t.id === inTx.id) return {
        ...t,
        accountId: updates.toAccountId,
        amount: updates.amount,
        date: updates.date,
        description: updates.description || '',
        categoryId: updates.categoryId,
      };
      return t;
    }));

    await refreshAccounts();
    return { success: true, error: null };
  };

  // ============================================================
  // DELETE TRANSACTION
  // ✅ FIX: Hapus semua manual supabase accounts update
  //    dan manual updateBalanceLocally.
  //    Trigger DB (Case 1: soft delete) sudah rollback balance
  //    otomatis saat deleted_at di-set.
  // ============================================================
  const deleteTransaction = async (id: string) => {
    setError(null);
    const transaction = transactions.find(t => t.id === id);

    if (transaction?.type === 'transfer' && transaction.transferPairId) {
      const now = new Date().toISOString();
      return withErrorHandlingNoData(
        () => supabase
          .from('transactions')
          .update({ deleted_at: now })
          .eq('transfer_pair_id', transaction.transferPairId),
        { setError }
      ).then(async result => {
        if (result.success) {
          setTransactions(prev =>
            prev.filter(t => t.transferPairId !== transaction.transferPairId)
          );
          await refreshAccounts();
          trashEvents.emit();
        }
        return result;
      });
    } else {
      return withErrorHandlingNoData(
        () => supabase
          .from('transactions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id),
        { setError }
      ).then(async result => {
        if (result.success) {
          setTransactions(prev => prev.filter(t => t.id !== id));
          await refreshAccounts();
          trashEvents.emit();
        }
        return result;
      });
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