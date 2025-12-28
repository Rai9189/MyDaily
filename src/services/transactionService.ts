import { supabase, handleSupabaseError, logError } from '../lib/supabase';
import { updateAccountBalance, getAccountById } from './accountService';
import type { Database } from '../types/database.types';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

/**
 * Transaction Service
 * Business logic untuk transactions management
 */

export interface TransactionFilters {
  accountId?: string;
  type?: 'Masuk' | 'Keluar';
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  showDeleted?: boolean;
}

/**
 * Get all transactions dengan filter
 */
export async function getTransactions(
  userId: string,
  filters?: TransactionFilters
): Promise<TransactionRow[]> {
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    if (filters?.accountId) {
      query = query.eq('account_id', filters.accountId);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.dateFrom) {
      query = query.gte('date', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('date', filters.dateTo);
    }

    if (!filters?.showDeleted) {
      query = query.eq('deleted', false);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    logError('getTransactions', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(
  userId: string,
  transactionId: string
): Promise<TransactionRow | null> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('getTransactionById', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Create new transaction dan update account balance
 */
export async function createTransaction(
  userId: string,
  transactionData: Omit<TransactionInsert, 'user_id' | 'id'>
): Promise<TransactionRow> {
  try {
    // 1. Get current account balance
    const account = await getAccountById(userId, transactionData.account_id);
    if (!account) throw new Error('Account not found');

    // 2. Calculate new balance
    const currentBalance = Number(account.balance);
    const amount = Number(transactionData.amount);
    const newBalance =
      transactionData.type === 'Masuk'
        ? currentBalance + amount
        : currentBalance - amount;

    // 3. Check balance tidak negative untuk pengeluaran
    if (newBalance < 0) {
      throw new Error('Saldo tidak cukup');
    }

    // 4. Insert transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transactionData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // 5. Update account balance
    await updateAccountBalance(userId, transactionData.account_id, newBalance);

    return data;
  } catch (error: any) {
    logError('createTransaction', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Update transaction dan recalculate balance
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  updates: TransactionUpdate
): Promise<TransactionRow> {
  try {
    // 1. Get old transaction
    const oldTransaction = await getTransactionById(userId, transactionId);
    if (!oldTransaction) throw new Error('Transaction not found');

    // 2. Revert old balance effect
    const account = await getAccountById(userId, oldTransaction.account_id);
    if (!account) throw new Error('Account not found');

    let currentBalance = Number(account.balance);
    const oldAmount = Number(oldTransaction.amount);

    // Revert old transaction
    if (oldTransaction.type === 'Masuk') {
      currentBalance -= oldAmount;
    } else {
      currentBalance += oldAmount;
    }

    // 3. Apply new transaction
    const newAmount = updates.amount ? Number(updates.amount) : oldAmount;
    const newType = updates.type || oldTransaction.type;

    if (newType === 'Masuk') {
      currentBalance += newAmount;
    } else {
      currentBalance -= newAmount;
    }

    if (currentBalance < 0) {
      throw new Error('Saldo tidak cukup');
    }

    // 4. Update transaction
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // 5. Update balance
    await updateAccountBalance(userId, oldTransaction.account_id, currentBalance);

    return data;
  } catch (error: any) {
    logError('updateTransaction', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Soft delete transaction
 */
export async function softDeleteTransaction(
  userId: string,
  transactionId: string
): Promise<TransactionRow> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('softDeleteTransaction', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Hard delete transaction (permanent)
 */
export async function hardDeleteTransaction(
  userId: string,
  transactionId: string
): Promise<void> {
  try {
    // Get transaction untuk revert balance
    const transaction = await getTransactionById(userId, transactionId);
    if (!transaction) throw new Error('Transaction not found');

    // Revert balance
    const account = await getAccountById(userId, transaction.account_id);
    if (account) {
      let newBalance = Number(account.balance);
      const amount = Number(transaction.amount);

      if (transaction.type === 'Masuk') {
        newBalance -= amount;
      } else {
        newBalance += amount;
      }

      await updateAccountBalance(userId, transaction.account_id, newBalance);
    }

    // Delete transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error: any) {
    logError('hardDeleteTransaction', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Restore soft deleted transaction
 */
export async function restoreTransaction(
  userId: string,
  transactionId: string
): Promise<TransactionRow> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        deleted: false,
        deleted_at: null,
      })
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('restoreTransaction', error);
    throw new Error(handleSupabaseError(error));
  }
}