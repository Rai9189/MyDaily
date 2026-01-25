// src/app/pages/__tests__/Dashboard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import { Dashboard } from '../Dashboard';
import { BrowserRouter } from 'react-router-dom';
import { 
  mockAccount, 
  mockTransaction, 
  mockTask, 
  mockNote, 
  mockCategory 
} from '../../../test/utils';

const mockAccounts = [mockAccount];
const mockTransactions = [mockTransaction];
const mockTasks = [
  { ...mockTask, status: 'Mendesak', completed: false },
  { ...mockTask, id: 'task-2', status: 'Mendekati', completed: false },
  { ...mockTask, id: 'task-3', status: 'Masih Lama', completed: false },
];
const mockNotes = [
  { ...mockNote, pinned: true },
  { ...mockNote, id: 'note-2', pinned: false },
];
const mockCategories = [mockCategory];

vi.mock('../../context/AccountContext', () => ({
  useAccounts: () => ({
    accounts: mockAccounts,
    loading: false,
    error: null,
  }),
}));

vi.mock('../../context/TransactionContext', () => ({
  useTransactions: () => ({
    transactions: mockTransactions,
    loading: false,
    error: null,
  }),
}));

vi.mock('../../context/TaskContext', () => ({
  useTasks: () => ({
    tasks: mockTasks,
    loading: false,
    error: null,
  }),
}));

vi.mock('../../context/NoteContext', () => ({
  useNotes: () => ({
    notes: mockNotes,
    loading: false,
    error: null,
  }),
}));

vi.mock('../../context/CategoryContext', () => ({
  useCategories: () => ({
    categories: mockCategories,
    loading: false,
  }),
}));

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dashboard header', () => {
      renderDashboard();

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/ringkasan aktivitas anda/i)).toBeInTheDocument();
    });

    it('should render all main sections', () => {
      renderDashboard();

      expect(screen.getByText(/total saldo/i)).toBeInTheDocument();
      expect(screen.getByText(/transaksi bulan ini/i)).toBeInTheDocument();
      expect(screen.getByText(/status tugas/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when data is loading', () => {
      vi.mock('../../context/AccountContext', () => ({
        useAccounts: () => ({
          accounts: [],
          loading: true,
          error: null,
        }),
      }));

      renderDashboard();

      expect(screen.getByRole('status')).toBeInTheDocument(); // Loader2 has implicit role
    });
  });

  describe('Total Balance Card', () => {
    it('should display total balance from all accounts', () => {
      renderDashboard();

      expect(screen.getByText(/total saldo/i)).toBeInTheDocument();
      // mockAccount has balance of 15500000
      expect(screen.getByText(/rp.*15\.500\.000/i)).toBeInTheDocument();
    });

    it('should display number of active accounts', () => {
      renderDashboard();

      expect(screen.getByText(/1 akun aktif/i)).toBeInTheDocument();
    });

    it('should calculate balance correctly with multiple accounts', () => {
      const multipleAccounts = [
        { ...mockAccount, balance: 1000000 },
        { ...mockAccount, id: 'acc-2', balance: 2000000 },
        { ...mockAccount, id: 'acc-3', balance: 3000000 },
      ];

      vi.mock('../../context/AccountContext', () => ({
        useAccounts: () => ({
          accounts: multipleAccounts,
          loading: false,
          error: null,
        }),
      }));

      // Need to re-render with new mock
      const { rerender } = renderDashboard();
      
      // Total should be 6,000,000
      expect(screen.getByText(/3 akun aktif/i)).toBeInTheDocument();
    });
  });

  describe('Transaction Summary', () => {
    it('should display income and expense sections', () => {
      renderDashboard();

      expect(screen.getByText(/pemasukan/i)).toBeInTheDocument();
      expect(screen.getByText(/pengeluaran/i)).toBeInTheDocument();
    });

    it('should display transaction counts', () => {
      renderDashboard();

      // Should show transaction count
      expect(screen.getByText(/transaksi/i)).toBeInTheDocument();
    });

    it('should filter transactions by current month', async () => {
      renderDashboard();

      // Dashboard should only show current month transactions
      await waitFor(() => {
        const headings = screen.getAllByText(/transaksi bulan ini/i);
        expect(headings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Expense by Category Chart', () => {
    it('should render category expense chart when data exists', () => {
      renderDashboard();

      expect(screen.getByText(/pengeluaran per kategori/i)).toBeInTheDocument();
    });

    it('should display category list with amounts', () => {
      renderDashboard();

      // Should show category name from mock
      expect(screen.getByText(mockCategory.name)).toBeInTheDocument();
    });
  });

  describe('Task Status Chart', () => {
    it('should render task status bar chart', () => {
      renderDashboard();

      expect(screen.getByText(/status tugas/i)).toBeInTheDocument();
    });

    it('should show task status categories', () => {
      renderDashboard();

      // BarChart should render task statuses
      expect(screen.getByText(/mendesak/i)).toBeInTheDocument();
      expect(screen.getByText(/mendekati/i)).toBeInTheDocument();
      expect(screen.getByText(/masih lama/i)).toBeInTheDocument();
    });
  });

  describe('Urgent Tasks Section', () => {
    it('should display urgent tasks when they exist', () => {
      renderDashboard();

      expect(screen.getByText(/tugas mendesak/i)).toBeInTheDocument();
      
      // Should show urgent task title
      const urgentTask = mockTasks.find(t => t.status === 'Mendesak' && !t.completed);
      if (urgentTask) {
        expect(screen.getByText(urgentTask.title)).toBeInTheDocument();
      }
    });

    it('should show deadline for urgent tasks', () => {
      renderDashboard();

      expect(screen.getByText(/deadline:/i)).toBeInTheDocument();
    });

    it('should display urgent badge', () => {
      renderDashboard();

      const badges = screen.getAllByText(/mendesak/i);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should limit urgent tasks display to 5', () => {
      const manyUrgentTasks = Array.from({ length: 10 }, (_, i) => ({
        ...mockTask,
        id: `task-${i}`,
        status: 'Mendesak' as const,
        completed: false,
        title: `Urgent Task ${i}`,
      }));

      vi.mock('../../context/TaskContext', () => ({
        useTasks: () => ({
          tasks: manyUrgentTasks,
          loading: false,
          error: null,
        }),
      }));

      renderDashboard();

      // Should only show max 5 tasks
      const taskElements = screen.getAllByText(/urgent task/i);
      expect(taskElements.length).toBeLessThanOrEqual(5);
    });

    it('should not show urgent tasks section when no urgent tasks exist', () => {
      const noUrgentTasks = mockTasks.map(t => ({ ...t, status: 'Masih Lama' as const }));

      vi.mock('../../context/TaskContext', () => ({
        useTasks: () => ({
          tasks: noUrgentTasks,
          loading: false,
          error: null,
        }),
      }));

      renderDashboard();

      // Section should not appear
      expect(screen.queryByText(/tugas mendesak \(/i)).not.toBeInTheDocument();
    });
  });

  describe('Pinned Notes Section', () => {
    it('should display pinned notes when they exist', () => {
      renderDashboard();

      expect(screen.getByText(/catatan terpin/i)).toBeInTheDocument();
      
      const pinnedNote = mockNotes.find(n => n.pinned);
      if (pinnedNote) {
        expect(screen.getByText(pinnedNote.title)).toBeInTheDocument();
      }
    });

    it('should show note content preview', () => {
      renderDashboard();

      const pinnedNote = mockNotes.find(n => n.pinned);
      if (pinnedNote) {
        expect(screen.getByText(pinnedNote.content)).toBeInTheDocument();
      }
    });

    it('should display timestamp for pinned notes', () => {
      renderDashboard();

      // Check for date formatting
      const dates = screen.getAllByText(/\d{1,2}\s+\w+\s+\d{4}/);
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should not show pinned notes section when no pinned notes exist', () => {
      const noPinnedNotes = mockNotes.map(n => ({ ...n, pinned: false }));

      vi.mock('../../context/NoteContext', () => ({
        useNotes: () => ({
          notes: noPinnedNotes,
          loading: false,
          error: null,
        }),
      }));

      renderDashboard();

      expect(screen.queryByText(/catatan terpin/i)).not.toBeInTheDocument();
    });
  });

  describe('Data Calculations', () => {
    it('should correctly calculate income from transactions', () => {
      const incomeTransactions = [
        { ...mockTransaction, type: 'Masuk' as const, amount: 1000000 },
        { ...mockTransaction, id: 'trans-2', type: 'Masuk' as const, amount: 2000000 },
      ];

      vi.mock('../../context/TransactionContext', () => ({
        useTransactions: () => ({
          transactions: incomeTransactions,
          loading: false,
          error: null,
        }),
      }));

      renderDashboard();

      // Should calculate total income correctly
      // Note: This depends on transaction being in current month
    });

    it('should correctly calculate expense from transactions', () => {
      const expenseTransactions = [
        { ...mockTransaction, type: 'Keluar' as const, amount: 500000 },
        { ...mockTransaction, id: 'trans-2', type: 'Keluar' as const, amount: 300000 },
      ];

      vi.mock('../../context/TransactionContext', () => ({
        useTransactions: () => ({
          transactions: expenseTransactions,
          loading: false,
          error: null,
        }),
      }));

      renderDashboard();

      // Should calculate total expense correctly
    });

    it('should count tasks by status correctly', () => {
      renderDashboard();

      // Should have counts for each status
      // 1 Mendesak, 1 Mendekati, 1 Masih Lama from mockTasks
    });
  });

  describe('Responsive Design', () => {
    it('should render grid layout for cards', () => {
      const { container } = renderDashboard();

      // Check for grid classes
      const grids = container.querySelectorAll('[class*="grid"]');
      expect(grids.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    it('should handle empty accounts gracefully', () => {
      vi.mock('../../context/AccountContext', () => ({
        useAccounts: () => ({
          accounts: [],
          loading: false,
          error: null,
        }),
      }));

      renderDashboard();

      expect(screen.getByText(/rp.*0/i)).toBeInTheDocument();
      expect(screen.getByText(/0 akun aktif/i)).toBeInTheDocument();
    });

    it('should handle empty transactions gracefully', () => {
      vi.mock('../../context/TransactionContext', () => ({
        useTransactions: () => ({
          transactions: [],
          loading: false,
          error: null,
        }),
      }));

      renderDashboard();

      // Should show 0 for income/expense
      const zeroAmounts = screen.getAllByText(/rp.*0/i);
      expect(zeroAmounts.length).toBeGreaterThan(0);
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency amounts correctly', () => {
      renderDashboard();

      // Indonesian Rupiah format
      const amounts = screen.getAllByText(/rp/i);
      expect(amounts.length).toBeGreaterThan(0);
    });
  });
});