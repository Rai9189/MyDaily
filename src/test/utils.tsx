// src/test/utils.tsx
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock semua context providers di LEVEL FILE INI
// Jangan import provider asli!

vi.mock('../app/context/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('../app/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' },
    session: { access_token: 'test-token' },
    loading: false,
    error: null,
    signUp: vi.fn(() => Promise.resolve({ success: true, error: null })),
    signIn: vi.fn(() => Promise.resolve({ success: true, error: null })),
    signOut: vi.fn(() => Promise.resolve()),
    resetPassword: vi.fn(() => Promise.resolve({ success: true, error: null })),
    updateProfile: vi.fn(() => Promise.resolve({ success: true, error: null })),
  }),
}));

vi.mock('../app/context/CategoryContext', () => ({
  CategoryProvider: ({ children }: { children: ReactNode }) => children,
  useCategories: () => ({
    categories: [],
    loading: false,
    error: null,
    getCategoriesByType: vi.fn(() => []),
    createCategory: vi.fn(() => Promise.resolve({ success: true, error: null })),
    updateCategory: vi.fn(() => Promise.resolve({ success: true, error: null })),
    deleteCategory: vi.fn(() => Promise.resolve({ success: true, error: null })),
    refreshCategories: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock('../app/context/AccountContext', () => ({
  AccountProvider: ({ children }: { children: ReactNode }) => children,
  useAccounts: () => ({
    accounts: [],
    loading: false,
    error: null,
    createAccount: vi.fn(() => Promise.resolve({ success: true, error: null })),
    updateAccount: vi.fn(() => Promise.resolve({ success: true, error: null })),
    deleteAccount: vi.fn(() => Promise.resolve({ success: true, error: null })),
    refreshAccounts: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock('../app/context/TransactionContext', () => ({
  TransactionProvider: ({ children }: { children: ReactNode }) => children,
  useTransactions: () => ({
    transactions: [],
    loading: false,
    error: null,
    createTransaction: vi.fn(() => Promise.resolve({ success: true, data: {}, error: null })),
    updateTransaction: vi.fn(() => Promise.resolve({ success: true, error: null })),
    deleteTransaction: vi.fn(() => Promise.resolve({ success: true, error: null })),
    getTransactionById: vi.fn(),
    refreshTransactions: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock('../app/context/TaskContext', () => ({
  TaskProvider: ({ children }: { children: ReactNode }) => children,
  useTasks: () => ({
    tasks: [],
    loading: false,
    error: null,
    createTask: vi.fn(() => Promise.resolve({ success: true, data: {}, error: null })),
    updateTask: vi.fn(() => Promise.resolve({ success: true, error: null })),
    deleteTask: vi.fn(() => Promise.resolve({ success: true, error: null })),
    completeTask: vi.fn(() => Promise.resolve({ success: true, error: null })),
    getTaskById: vi.fn(),
    refreshTasks: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock('../app/context/NoteContext', () => ({
  NoteProvider: ({ children }: { children: ReactNode }) => children,
  useNotes: () => ({
    notes: [],
    loading: false,
    error: null,
    createNote: vi.fn(() => Promise.resolve({ success: true, data: {}, error: null })),
    updateNote: vi.fn(() => Promise.resolve({ success: true, error: null })),
    deleteNote: vi.fn(() => Promise.resolve({ success: true, error: null })),
    togglePin: vi.fn(() => Promise.resolve({ success: true, error: null })),
    getNoteById: vi.fn(),
    refreshNotes: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock('../app/context/AttachmentContext', () => ({
  AttachmentProvider: ({ children }: { children: ReactNode }) => children,
  useAttachments: () => ({
    uploadAttachment: vi.fn(() => Promise.resolve({ success: true, data: {}, error: null })),
    deleteAttachment: vi.fn(() => Promise.resolve({ success: true, error: null })),
    getAttachments: vi.fn(() => Promise.resolve({ data: [], error: null })),
    deleteAllAttachments: vi.fn(() => Promise.resolve({ success: true, error: null })),
  }),
}));

// Simple wrapper - gunakan MemoryRouter untuk menghindari double router
const AllTheProviders = ({ children }: { children: ReactNode }) => {
  return <MemoryRouter>{children}</MemoryRouter>;
};

// Custom render
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock data
export const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  pin_type: 'numeric' as const,
};

export const mockAccount = {
  id: 'test-account-id',
  name: 'Test Account',
  type: 'Bank' as const,
  balance: 15500000,
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
};

export const mockCategory = {
  id: 'test-category-id',
  name: 'Test Category',
  type: 'transaction' as const,
  color: '#3b82f6',
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
};

export const mockTransaction = {
  id: 'test-transaction-id',
  accountId: 'test-account-id',
  categoryId: 'test-category-id',
  amount: 50000,
  type: 'Keluar' as const,
  date: new Date().toISOString().split('T')[0],
  description: 'Test transaction',
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
};

export const mockTask = {
  id: 'test-task-id',
  title: 'Test Task',
  deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  status: 'Masih Lama' as const,
  completed: false,
  categoryId: 'test-category-id',
  description: 'Test task description',
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
};

export const mockNote = {
  id: 'test-note-id',
  title: 'Test Note',
  content: 'Test note content',
  timestamp: new Date().toISOString(),
  pinned: false,
  categoryId: 'test-category-id',
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
};