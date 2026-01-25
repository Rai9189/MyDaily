// src/test/utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../app/context/ThemeContext';
import { AuthProvider } from '../app/context/AuthContext';
import { CategoryProvider } from '../app/context/CategoryContext';
import { AccountProvider } from '../app/context/AccountContext';
import { TransactionProvider } from '../app/context/TransactionContext';
import { TaskProvider } from '../app/context/TaskContext';
import { NoteProvider } from "../app/context/NoteContext";
import { AttachmentProvider } from '../app/context/AttachmentContext';

// All providers wrapper
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CategoryProvider>
          <AccountProvider>
            <TransactionProvider>
              <TaskProvider>
                <NoteProvider>
                  <AttachmentProvider>
                    <BrowserRouter>
                      {children}
                    </BrowserRouter>
                  </AttachmentProvider>
                </NoteProvider>
              </TaskProvider>
            </TransactionProvider>
          </AccountProvider>
        </CategoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

// Custom render with all providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  pin_type: 'numeric' as const,
};

// Mock account data
export const mockAccount = {
  id: 'test-account-id',
  name: 'Test Account',
  type: 'Bank' as const,
  balance: 1000000,
};

// Mock category data
export const mockCategory = {
  id: 'test-category-id',
  name: 'Test Category',
  type: 'transaction' as const,
  color: '#3b82f6',
};

// Mock transaction data
export const mockTransaction = {
  id: 'test-transaction-id',
  accountId: 'test-account-id',
  categoryId: 'test-category-id',
  amount: 50000,
  type: 'Keluar' as const,
  date: '2025-01-24',
  description: 'Test transaction',
};

// Mock task data
export const mockTask = {
  id: 'test-task-id',
  title: 'Test Task',
  deadline: '2025-01-30',
  status: 'Masih Lama' as const,
  completed: false,
  categoryId: 'test-category-id',
  description: 'Test task description',
};

// Mock note data
export const mockNote = {
  id: 'test-note-id',
  title: 'Test Note',
  content: 'Test note content',
  timestamp: new Date().toISOString(),
  pinned: false,
  categoryId: 'test-category-id',
};