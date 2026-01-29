// src/app/pages/__tests__/Dashboard.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import { Dashboard } from '../Dashboard';

// Tidak perlu override mock lagi karena test/utils.tsx sudah menyediakan mock data yang benar

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Clear any previous state if needed
  });

  describe('Rendering', () => {
    it('should render dashboard header', () => {
      render(<Dashboard />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render all main sections', () => {
      render(<Dashboard />);

      expect(screen.getByText(/total saldo/i)).toBeInTheDocument();
      expect(screen.getByText(/transaksi bulan ini/i)).toBeInTheDocument();
    });
  });

  describe('Total Balance Card', () => {
    it('should display total balance from all accounts', () => {
      render(<Dashboard />);

      expect(screen.getByText(/total saldo/i)).toBeInTheDocument();
      // mockAccount from test/utils has balance of 15500000
      // Format: "Rp15.500.000" or "Rp 15.500.000"
      expect(screen.getByText(/15\.500\.000/)).toBeInTheDocument();
    });

    it('should display number of active accounts', () => {
      render(<Dashboard />);

      // mockAccounts array has 1 account
      // Text will be "1 Akun Aktif"
      expect(screen.getByText(/1.*akun aktif/i)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should handle dashboard render correctly', () => {
      render(<Dashboard />);
      
      // Basic rendering test
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});