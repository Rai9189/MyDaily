// src/app/context/__tests__/TransactionContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { TransactionProvider, useTransactions } from '../TransactionContext';
import { AuthProvider } from '../AuthContext';
import { supabase } from '../../../lib/supabase';
import { mockUser, mockTransaction, mockAccount, mockCategory } from '../../../test/utils';

vi.mock('../AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
    loading: false,
    error: null,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <TransactionProvider>{children}</TransactionProvider>
  </AuthProvider>
);

describe('TransactionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // ✅ Setup mock yang PERSISTENT untuk semua test
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [mockTransaction],
            error: null,
          }),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockTransaction,
            error: null,
          }),
        } as any;
      }
      return {} as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with empty transactions and loading true', () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });
      
      expect(result.current.transactions).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useTransactions());
      }).toThrow('useTransactions must be used within TransactionProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Fetch Transactions', () => {
    it('should fetch transactions on mount when user is authenticated', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0]).toEqual(mockTransaction);
      expect(result.current.error).toBe(null);
    });

    it('should handle fetch error gracefully', async () => {
      const errorMessage = 'Failed to fetch transactions';
      
      vi.spyOn(supabase, 'from').mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error(errorMessage),
        }),
      } as any));

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.transactions).toEqual([]);
    });
  });

  describe('Create Transaction', () => {
    it('should create a new transaction successfully', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      // ✅ Wait for initial load first
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const newTransaction = {
        accountId: mockAccount.id,
        categoryId: mockCategory.id,
        amount: 50000,
        type: 'Keluar' as const,
        date: '2025-01-15',
        description: 'Test transaction',
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createTransaction(newTransaction);
      });

      expect(createResult).toHaveProperty('success', true);
      expect(createResult).toHaveProperty('error', null);
    });

    it('should handle create transaction error', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const errorMessage = 'Insert failed';
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error(errorMessage),
          }),
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        insert: insertMock,
      } as any);

      let createResult;
      await act(async () => {
        createResult = await result.current.createTransaction({
          accountId: 'acc1',
          categoryId: 'cat1',
          amount: 1000,
          type: 'Masuk',
          date: '2025-01-15',
        });
      });

      expect(createResult).toHaveProperty('success', false);
      expect(createResult).toHaveProperty('error', errorMessage);
    });
  });

  describe('Update Transaction', () => {
    it('should update transaction successfully', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateTransaction(mockTransaction.id, {
          amount: 75000,
          description: 'Updated description',
        });
      });

      expect(updateResult).toHaveProperty('success', true);
      expect(updateResult).toHaveProperty('error', null);
    });

    it('should handle update transaction error', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const errorMessage = 'Update failed';
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error(errorMessage),
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        update: updateMock,
      } as any);

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateTransaction('trans-1', { amount: 5000 });
      });

      expect(updateResult).toHaveProperty('success', false);
      expect(updateResult).toHaveProperty('error', errorMessage);
    });
  });

  describe('Delete Transaction', () => {
    it('should delete transaction successfully', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteTransaction(mockTransaction.id);
      });

      expect(deleteResult).toHaveProperty('success', true);
      expect(deleteResult).toHaveProperty('error', null);
    });

    it('should handle delete transaction error', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const errorMessage = 'Delete failed';
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error(errorMessage),
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        delete: deleteMock,
      } as any);

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteTransaction('trans-1');
      });

      expect(deleteResult).toHaveProperty('success', false);
      expect(deleteResult).toHaveProperty('error', errorMessage);
    });
  });

  describe('Get Transaction By ID', () => {
    it('should return transaction by id', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const transaction = result.current.getTransactionById(mockTransaction.id);
      expect(transaction).toEqual(mockTransaction);
    });

    it('should return undefined for non-existent id', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const transaction = result.current.getTransactionById('non-existent');
      expect(transaction).toBeUndefined();
    });
  });

  describe('Refresh Transactions', () => {
    it('should refresh transactions list', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.refreshTransactions();
      });

      expect(result.current.transactions).toHaveLength(1);
    });
  });
});