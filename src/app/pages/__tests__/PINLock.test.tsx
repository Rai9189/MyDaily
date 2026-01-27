// src/app/pages/__tests__/PINLock.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test/utils';
import { PINLock } from '../PINLock';

const mockNavigate = vi.fn();
const mockSignOut = vi.fn();
const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  pinType: 'numeric' as const,
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: mockSignOut,
    loading: false,
  }),
}));

describe('PINLock Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Set up default PIN
    localStorage.setItem('pin', btoa('1234'));
    localStorage.setItem('pinType', 'pin4');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render PIN lock screen with user greeting', () => {
      render(<PINLock />);

      expect(screen.getByText('MyDaily')).toBeInTheDocument();
      expect(screen.getByText(/halo, john doe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pin 4 angka/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /buka/i })).toBeInTheDocument();
    });

    it('should render logout button', () => {
      render(<PINLock />);

      expect(screen.getByRole('button', { name: /keluar akun/i })).toBeInTheDocument();
    });

    it('should show user email at bottom', () => {
      render(<PINLock />);

      expect(screen.getByText(/login sebagai:/i)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });
  });

  describe('PIN Type Display', () => {
    it('should show PIN 4 label for pin4 type', () => {
      localStorage.setItem('pinType', 'pin4');
      render(<PINLock />);

      expect(screen.getByLabelText(/pin 4 angka/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('1234')).toBeInTheDocument();
    });

    it('should show PIN 6 label for pin6 type', () => {
      localStorage.setItem('pinType', 'pin6');
      localStorage.setItem('pin', btoa('123456'));
      render(<PINLock />);

      expect(screen.getByLabelText(/pin 6 angka/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
    });

    it('should show Password label for password type', () => {
      localStorage.setItem('pinType', 'password');
      localStorage.setItem('pin', btoa('mypassword'));
      render(<PINLock />);

      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/masukkan password/i)).toBeInTheDocument();
    });
  });

  describe('PIN Verification', () => {
    it('should unlock and navigate to dashboard with correct PIN', async () => {
      const user = userEvent.setup();
      render(<PINLock />);

      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      await user.type(pinInput, '1234');

      const unlockButton = screen.getByRole('button', { name: /buka/i });
      await user.click(unlockButton);

      await waitFor(() => {
        expect(localStorage.getItem('pinUnlocked')).toBe('true');
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should show error with incorrect PIN', async () => {
      const user = userEvent.setup();
      render(<PINLock />);

      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      await user.type(pinInput, '9999');

      const unlockButton = screen.getByRole('button', { name: /buka/i });
      await user.click(unlockButton);

      await waitFor(() => {
        expect(screen.getByText(/pin\/password salah/i)).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should clear PIN input after incorrect attempt', async () => {
      const user = userEvent.setup();
      render(<PINLock />);

      const pinInput = screen.getByLabelText(/pin 4 angka/i) as HTMLInputElement;
      await user.type(pinInput, '9999');

      const unlockButton = screen.getByRole('button', { name: /buka/i });
      await user.click(unlockButton);

      await waitFor(() => {
        expect(pinInput.value).toBe('');
      });
    });
  });

  // ... sisanya sama, hanya hapus <BrowserRouter> wrapper
});