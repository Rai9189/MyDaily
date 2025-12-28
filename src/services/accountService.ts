import { supabase, handleSupabaseError, logError } from '../lib/supabase';
import type { Database } from '../types/database.types';

type AccountRow = Database['public']['Tables']['accounts']['Row'];
type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
type AccountUpdate = Database['public']['Tables']['accounts']['Update'];

/**
 * Account Service
 * Business logic untuk accounts management
 */

/**
 * Get all accounts untuk user
 */
export async function getAccounts(userId: string): Promise<AccountRow[]> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    logError('getAccounts', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Get account by ID
 */
export async function getAccountById(
  userId: string,
  accountId: string
): Promise<AccountRow | null> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('getAccountById', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Create new account
 */
export async function createAccount(
  userId: string,
  accountData: Omit<AccountInsert, 'user_id' | 'id'>
): Promise<AccountRow> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...accountData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('createAccount', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Update account
 */
export async function updateAccount(
  userId: string,
  accountId: string,
  updates: AccountUpdate
): Promise<AccountRow> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('updateAccount', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Delete account
 */
export async function deleteAccount(
  userId: string,
  accountId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error: any) {
    logError('deleteAccount', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Update account balance
 */
export async function updateAccountBalance(
  userId: string,
  accountId: string,
  newBalance: number
): Promise<AccountRow> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('updateAccountBalance', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Get total balance dari semua accounts
 */
export async function getTotalBalance(userId: string): Promise<number> {
  try {
    const accounts = await getAccounts(userId);
    return accounts.reduce((total, account) => total + Number(account.balance), 0);
  } catch (error: any) {
    logError('getTotalBalance', error);
    return 0;
  }
}