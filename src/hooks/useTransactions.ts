import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as transactionService from '../services/transactionService';
import type { Database } from '../types/database.types';
import type { TransactionFilters } from '../services/transactionService';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

/**
 * Custom Hook untuk Transactions Management
 */
export function useTransactions(initialFilters?: TransactionFilters) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFilters | undefined>(initialFilters);

  /**
   * Fetch transactions
   */
  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await transactionService.getTransactions(user.id, filters);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  /**
   * Create new transaction
   */
  const addTransaction = async (
    transactionData: Omit<TransactionInsert, 'user_id' | 'id'>
  ): Promise<TransactionRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const newTransaction = await transactionService.createTransaction(
        user.id,
        transactionData
      );
      setTransactions((prev) => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding transaction:', err);
      return null;
    }
  };

  /**
   * Update transaction
   */
  const editTransaction = async (
    transactionId: string,
    updates: TransactionUpdate
  ): Promise<TransactionRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const updatedTransaction = await transactionService.updateTransaction(
        user.id,
        transactionId,
        updates
      );
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? updatedTransaction : t))
      );
      return updatedTransaction;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating transaction:', err);
      return null;
    }
  };

  /**
   * Soft delete transaction
   */
  const softDelete = async (transactionId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      const deletedTransaction = await transactionService.softDeleteTransaction(
        user.id,
        transactionId
      );
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? deletedTransaction : t))
      );
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error soft deleting transaction:', err);
      return false;
    }
  };

  /**
   * Hard delete transaction (permanent)
   */
  const hardDelete = async (transactionId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      await transactionService.hardDeleteTransaction(user.id, transactionId);
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error hard deleting transaction:', err);
      return false;
    }
  };

  /**
   * Restore transaction
   */
  const restore = async (transactionId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      const restoredTransaction = await transactionService.restoreTransaction(
        user.id,
        transactionId
      );
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? restoredTransaction : t))
      );
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error restoring transaction:', err);
      return false;
    }
  };

  /**
   * Update filters
   */
  const updateFilters = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
  };

  /**
   * Get transaction by ID
   */
  const getTransactionById = useCallback(
    (transactionId: string): TransactionRow | undefined => {
      return transactions.find((t) => t.id === transactionId);
    },
    [transactions]
  );

  // Fetch transactions saat component mount atau user/filters berubah
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    filters,
    fetchTransactions,
    addTransaction,
    editTransaction,
    softDelete,
    hardDelete,
    restore,
    updateFilters,
    getTransactionById,
  };
}