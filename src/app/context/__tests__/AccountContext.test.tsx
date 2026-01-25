// src/app/context/__tests__/AccountContext.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AccountProvider, useAccounts } from '../AccountContext';
import { AuthProvider } from '../AuthContext';
import { mockUser, mockAccount } from '../../../test/utils';

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: [mockAccount], 
            error: null 
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: mockAccount, 
            error: null 
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
  handleSupabaseError: vi.fn((error) => error?.message || 'Error'),
}));

// Mock Auth Context
vi.mock('../AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: mockUser,
    loading: false,
    error: null,
  }),
}));

describe('AccountContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <AccountProvider>{children}</AccountProvider>
    </AuthProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide accounts data', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0]).toEqual(mockAccount);
    expect(result.current.error).toBeNull();
  });

  it('should create account successfully', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newAccount = {
      name: 'New Account',
      type: 'Bank' as const,
      balance: 5000000,
    };

    const response = await result.current.createAccount(newAccount);

    expect(response.success).toBe(true);
    expect(response.error).toBeNull();
  });

  it('should update account successfully', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updates = { name: 'Updated Account' };
    const response = await result.current.updateAccount('test-account-id', updates);

    expect(response.success).toBe(true);
    expect(response.error).toBeNull();
  });

  it('should delete account successfully', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const response = await result.current.deleteAccount('test-account-id');

    expect(response.success).toBe(true);
    expect(response.error).toBeNull();
  });

  it('should refresh accounts', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refreshAccounts();

    expect(result.current.accounts).toBeDefined();
  });

  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAccounts());
    }).toThrow('useAccounts must be used within AccountProvider');
  });
});