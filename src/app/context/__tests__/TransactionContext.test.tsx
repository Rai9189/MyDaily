// src/app/context/__tests__/TransactionContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { TransactionProvider, useTransactions } from '../TransactionContext';
import { AuthProvider } from '../AuthContext';
import { supabase } from '../../../lib/supabase';
import { mockUser, mockTransaction, mockAccount, mockCategory } from '../../../test/utils';

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  handleSupabaseError: vi.fn((err) => err.message || 'Unknown error'),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <TransactionProvider>{children}</TransactionProvider>
  </AuthProvider>
);

describe('TransactionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated user
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
      // Suppress console.error for this test
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
      });

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
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.transactions).toEqual([]);
    });
  });

  describe('Create Transaction', () => {
    it('should create a new transaction successfully', async () => {
      const newTransaction = {
        accountId: mockAccount.id,
        categoryId: mockCategory.id,
        amount: 50000,
        type: 'Keluar' as const,
        date: '2025-01-15',
        description: 'Test transaction',
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { id: 'new-id', ...newTransaction },
        error: null,
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      insertMock.mockReturnValue({
        select: selectMock,
      });

      selectMock.mockReturnValue({
        single: singleMock,
      });

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createResult;
      await act(async () => {
        createResult = await result.current.createTransaction(newTransaction);
      });

      expect(createResult).toEqual({ success: true, data: expect.any(Object), error: null });
      expect(insertMock).toHaveBeenCalled();
    });

    it('should handle create transaction error', async () => {
      const errorMessage = 'Insert failed';
      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      insertMock.mockReturnValue({ select: selectMock });
      selectMock.mockReturnValue({ single: singleMock });

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

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

      expect(createResult).toEqual({ success: false, error: errorMessage });
    });
  });

  describe('Update Transaction', () => {
    it('should update transaction successfully', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockTransaction], error: null }),
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      updateMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateTransaction(mockTransaction.id, {
          amount: 75000,
          description: 'Updated description',
        });
      });

      expect(updateResult).toEqual({ success: true, error: null });
      expect(updateMock).toHaveBeenCalled();
    });

    it('should handle update transaction error', async () => {
      const errorMessage = 'Update failed';
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockTransaction], error: null }),
            update: updateMock,
          } as any;
        }
        return {} as any;
      });

      updateMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateTransaction('trans-1', { amount: 5000 });
      });

      expect(updateResult).toEqual({ success: false, error: errorMessage });
    });
  });

  describe('Delete Transaction', () => {
    it('should delete transaction successfully', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockTransaction], error: null }),
            delete: deleteMock,
          } as any;
        }
        return {} as any;
      });

      deleteMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteTransaction(mockTransaction.id);
      });

      expect(deleteResult).toEqual({ success: true, error: null });
      expect(deleteMock).toHaveBeenCalled();
    });

    it('should handle delete transaction error', async () => {
      const errorMessage = 'Delete failed';
      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockTransaction], error: null }),
            delete: deleteMock,
          } as any;
        }
        return {} as any;
      });

      deleteMock.mockReturnValue({ eq: eqMock });

      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteTransaction('trans-1');
      });

      expect(deleteResult).toEqual({ success: false, error: errorMessage });
    });
  });

  describe('Get Transaction By ID', () => {
    it('should return transaction by id', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const transaction = result.current.getTransactionById(mockTransaction.id);
      expect(transaction).toEqual(mockTransaction);
    });

    it('should return undefined for non-existent id', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const transaction = result.current.getTransactionById('non-existent');
      expect(transaction).toBeUndefined();
    });
  });

  describe('Refresh Transactions', () => {
    it('should refresh transactions list', async () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCount = result.current.transactions.length;

      await act(async () => {
        await result.current.refreshTransactions();
      });

      expect(result.current.transactions.length).toBe(initialCount);
    });
  });
});