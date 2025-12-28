import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as accountService from '../services/accountService';
import type { Database } from '../types/database.types';

type AccountRow = Database['public']['Tables']['accounts']['Row'];
type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
type AccountUpdate = Database['public']['Tables']['accounts']['Update'];

/**
 * Custom Hook untuk Accounts Management
 */
export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all accounts
   */
  const fetchAccounts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await accountService.getAccounts(user.id);
      setAccounts(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Create new account
   */
  const addAccount = async (
    accountData: Omit<AccountInsert, 'user_id' | 'id'>
  ): Promise<AccountRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const newAccount = await accountService.createAccount(user.id, accountData);
      setAccounts((prev) => [newAccount, ...prev]);
      return newAccount;
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding account:', err);
      return null;
    }
  };

  /**
   * Update account
   */
  const editAccount = async (
    accountId: string,
    updates: AccountUpdate
  ): Promise<AccountRow | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const updatedAccount = await accountService.updateAccount(
        user.id,
        accountId,
        updates
      );
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? updatedAccount : acc))
      );
      return updatedAccount;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating account:', err);
      return null;
    }
  };

  /**
   * Delete account
   */
  const removeAccount = async (accountId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      await accountService.deleteAccount(user.id, accountId);
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting account:', err);
      return false;
    }
  };

  /**
   * Get total balance
   */
  const getTotalBalance = useCallback((): number => {
    return accounts.reduce((total, account) => total + Number(account.balance), 0);
  }, [accounts]);

  /**
   * Get account by ID
   */
  const getAccountById = useCallback(
    (accountId: string): AccountRow | undefined => {
      return accounts.find((acc) => acc.id === accountId);
    },
    [accounts]
  );

  // Fetch accounts saat component mount atau user berubah
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    addAccount,
    editAccount,
    removeAccount,
    getTotalBalance,
    getAccountById,
  };
}