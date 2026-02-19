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
      expect(screen.getByText(new RegExp(mockUser.email, 'i'))).toBeInTheDocument();
    });
  });

  describe('PIN Type Display', () => {
    it('should show PIN 4 label for pin4 type', () => {
      localStorage.setItem('pinType', 'pin4');
      render(<PINLock />);

      expect(screen.getByLabelText(/pin 4 angka/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('1234')).toBeInTheDocument();
    });

    it('should show PIN 6 label for pin6 type', async () => {
      localStorage.setItem('pinType', 'pin6');
      localStorage.setItem('pin', btoa('123456'));
      
      render(<PINLock />);

      // ✅ FIXED: Wait for useEffect to update pinType state
      await waitFor(() => {
        const input = screen.getByPlaceholderText('123456');
        expect(input).toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByLabelText(/pin 6 angka/i)).toBeInTheDocument();
    });

    it('should show Password label for password type', async () => {
      localStorage.setItem('pinType', 'password');
      localStorage.setItem('pin', btoa('mypassword'));
      
      render(<PINLock />);

      // ✅ FIXED: Wait for useEffect to update pinType state
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/masukkan password/i);
        expect(input).toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
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

      // ✅ FIXED: Wait for the real setTimeout (500ms) to complete
      await waitFor(() => {
        expect(localStorage.getItem('pinUnlocked')).toBe('true');
      }, { timeout: 2000 });

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should show error with incorrect PIN', async () => {
      const user = userEvent.setup();
      render(<PINLock />);

      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      await user.type(pinInput, '9999');

      const unlockButton = screen.getByRole('button', { name: /buka/i });
      await user.click(unlockButton);

      // ✅ FIXED: Wait for the real setTimeout to complete
      await waitFor(() => {
        expect(screen.getByText(/pin\/password salah/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should clear PIN input after incorrect attempt', async () => {
      const user = userEvent.setup();
      render(<PINLock />);

      const pinInput = screen.getByLabelText(/pin 4 angka/i) as HTMLInputElement;
      await user.type(pinInput, '9999');

      const unlockButton = screen.getByRole('button', { name: /buka/i });
      await user.click(unlockButton);

      // ✅ FIXED: Check for empty value or null (number input can be null when cleared)
      await waitFor(() => {
        const currentValue = pinInput.value;
        expect(currentValue === '' || currentValue === null).toBe(true);
      }, { timeout: 2000 });
    });

    it('should lock after 5 failed attempts', async () => {
      const user = userEvent.setup();
      render(<PINLock />);

      // ✅ Attempt 5 wrong PINs
      for (let i = 0; i < 5; i++) {
        const pinInput = screen.getByLabelText(/pin 4 angka/i);
        await user.clear(pinInput);
        await user.type(pinInput, '9999');

        const unlockButton = screen.getByRole('button', { name: /buka/i });
        await user.click(unlockButton);

        // Wait for processing (500ms setTimeout in component)
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // ✅ Check if locked
      await waitFor(() => {
        expect(screen.getByText(/aplikasi terkunci/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(localStorage.getItem('pinLockUntil')).not.toBeNull();
    });
  });

  describe('Logout Functionality', () => {
    it('should call signOut and navigate to login on logout', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm to always return true
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      render(<PINLock />);

      const logoutButton = screen.getByRole('button', { name: /keluar akun/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
      // ✅ FIXED: After removeItem, localStorage returns null (our mock is correct)
      expect(localStorage.getItem('pin')).toBeNull();
      expect(localStorage.getItem('pinUnlocked')).toBeNull();
    });

    it('should not logout when user cancels confirmation', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm to return false
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(<PINLock />);

      const logoutButton = screen.getByRole('button', { name: /keluar akun/i });
      await user.click(logoutButton);

      // Should not call signOut or navigate
      expect(mockSignOut).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Lock Timer', () => {
    it('should display remaining lock time', async () => {
      // ✅ CRITICAL: Set localStorage BEFORE render so useEffect picks it up
      const lockUntil = Date.now() + 10000;
      localStorage.setItem('pinLockUntil', lockUntil.toString());
      localStorage.setItem('pinAttempts', '5');

      // Render component - useEffect will run and check localStorage
      render(<PINLock />);

      // ✅ Wait for useEffect to process the lock state (it runs after render)
      await waitFor(() => {
        const lockedMessage = screen.queryByText(/aplikasi terkunci/i);
        expect(lockedMessage).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check if timer is displayed
      await waitFor(() => {
        expect(screen.getByText(/tunggu \d+ detik/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should unlock after timer expires', async () => {
      // ✅ CRITICAL: Set localStorage BEFORE render
      const lockUntil = Date.now() + 1500; // 1.5 seconds
      localStorage.setItem('pinLockUntil', lockUntil.toString());
      localStorage.setItem('pinAttempts', '5');

      render(<PINLock />);

      // Initially locked - wait for useEffect to process
      await waitFor(() => {
        expect(screen.getByText(/aplikasi terkunci/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for timer to expire completely (1.5s + buffer)
      await waitFor(() => {
        const lockedMessage = screen.queryByText(/aplikasi terkunci/i);
        expect(lockedMessage).not.toBeInTheDocument();
      }, { timeout: 4000 });

      // Should be able to enter PIN again
      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      expect(pinInput).not.toBeDisabled();
    });
  });
});