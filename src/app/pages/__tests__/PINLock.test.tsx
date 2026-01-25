// src/app/pages/__tests__/PINLock.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { PINLock } from '../PINLock';
import { BrowserRouter } from 'react-router-dom';

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

const renderPINLock = () => {
  return render(
    <BrowserRouter>
      <PINLock />
    </BrowserRouter>
  );
};

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
      renderPINLock();

      expect(screen.getByText('MyDaily')).toBeInTheDocument();
      expect(screen.getByText(/halo, john doe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pin 4 angka/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /buka/i })).toBeInTheDocument();
    });

    it('should render logout button', () => {
      renderPINLock();

      expect(screen.getByRole('button', { name: /keluar akun/i })).toBeInTheDocument();
    });

    it('should show user email at bottom', () => {
      renderPINLock();

      expect(screen.getByText(/login sebagai:/i)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });
  });

  describe('PIN Type Display', () => {
    it('should show PIN 4 label for pin4 type', () => {
      localStorage.setItem('pinType', 'pin4');
      renderPINLock();

      expect(screen.getByLabelText(/pin 4 angka/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('1234')).toBeInTheDocument();
    });

    it('should show PIN 6 label for pin6 type', () => {
      localStorage.setItem('pinType', 'pin6');
      localStorage.setItem('pin', btoa('123456'));
      renderPINLock();

      expect(screen.getByLabelText(/pin 6 angka/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
    });

    it('should show Password label for password type', () => {
      localStorage.setItem('pinType', 'password');
      localStorage.setItem('pin', btoa('mypassword'));
      renderPINLock();

      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/masukkan password/i)).toBeInTheDocument();
    });
  });

  describe('PIN Verification', () => {
    it('should unlock and navigate to dashboard with correct PIN', async () => {
      const user = userEvent.setup();
      renderPINLock();

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
      renderPINLock();

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
      renderPINLock();

      const pinInput = screen.getByLabelText(/pin 4 angka/i) as HTMLInputElement;
      await user.type(pinInput, '9999');

      const unlockButton = screen.getByRole('button', { name: /buka/i });
      await user.click(unlockButton);

      await waitFor(() => {
        expect(pinInput.value).toBe('');
      });
    });
  });

  describe('Attempt Counter', () => {
    it('should increment attempts on wrong PIN', async () => {
      const user = userEvent.setup();
      renderPINLock();

      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      const unlockButton = screen.getByRole('button', { name: /buka/i });

      // First wrong attempt
      await user.type(pinInput, '9999');
      await user.click(unlockButton);

      await waitFor(() => {
        expect(screen.getByText(/1\/5 percobaan/i)).toBeInTheDocument();
      });
    });

    it('should show warning when attempts are running out', async () => {
      const user = userEvent.setup();
      localStorage.setItem('pinAttempts', '3');
      renderPINLock();

      await waitFor(() => {
        expect(screen.getByText(/2 percobaan tersisa/i)).toBeInTheDocument();
      });
    });

    it('should lock app after 5 failed attempts', async () => {
      const user = userEvent.setup();
      renderPINLock();

      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      const unlockButton = screen.getByRole('button', { name: /buka/i });

      // Make 5 wrong attempts
      for (let i = 0; i < 5; i++) {
        await user.clear(pinInput);
        await user.type(pinInput, '9999');
        await user.click(unlockButton);
        
        await waitFor(() => {
          expect(screen.getByText(new RegExp(`${i + 1}/5`, 'i'))).toBeInTheDocument();
        });
      }

      // Should now be locked
      await waitFor(() => {
        expect(screen.getByText(/aplikasi terkunci/i)).toBeInTheDocument();
        expect(screen.getByText(/tunggu.*detik/i)).toBeInTheDocument();
      });
    });
  });

  describe('Lock Timer', () => {
    it('should display lock timer countdown', async () => {
      const lockUntil = Date.now() + 30000; // 30 seconds from now
      localStorage.setItem('pinLockUntil', lockUntil.toString());
      localStorage.setItem('pinAttempts', '5');

      renderPINLock();

      await waitFor(() => {
        expect(screen.getByText(/tunggu.*30.*detik/i)).toBeInTheDocument();
      });
    });

    it('should disable unlock button when locked', async () => {
      const lockUntil = Date.now() + 30000;
      localStorage.setItem('pinLockUntil', lockUntil.toString());
      localStorage.setItem('pinAttempts', '5');

      renderPINLock();

      await waitFor(() => {
        const unlockButton = screen.getByRole('button', { name: /terkunci/i });
        expect(unlockButton).toBeDisabled();
      });
    });

    it('should clear lock after timer expires', async () => {
      const lockUntil = Date.now() - 1000; // Already expired
      localStorage.setItem('pinLockUntil', lockUntil.toString());
      localStorage.setItem('pinAttempts', '5');

      renderPINLock();

      await waitFor(() => {
        expect(localStorage.getItem('pinLockUntil')).toBeNull();
        expect(localStorage.getItem('pinAttempts')).toBeNull();
      });
    });
  });

  describe('Logout Functionality', () => {
    it('should show confirmation before logout', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderPINLock();

      const logoutButton = screen.getByRole('button', { name: /keluar akun/i });
      await user.click(logoutButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockSignOut).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should logout and clear PIN data when confirmed', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderPINLock();

      const logoutButton = screen.getByRole('button', { name: /keluar akun/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      // Check that PIN data is cleared
      expect(localStorage.getItem('pinUnlocked')).toBeNull();
      expect(localStorage.getItem('pinSetup')).toBeNull();
      expect(localStorage.getItem('pin')).toBeNull();
      expect(localStorage.getItem('pinType')).toBeNull();

      confirmSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during verification', async () => {
      const user = userEvent.setup();
      renderPINLock();

      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      await user.type(pinInput, '1234');

      const unlockButton = screen.getByRole('button', { name: /buka/i });
      await user.click(unlockButton);

      // Should show loading state briefly
      await waitFor(() => {
        expect(screen.getByText(/memverifikasi/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Display', () => {
    it('should clear error when typing new PIN', async () => {
      const user = userEvent.setup();
      renderPINLock();

      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      const unlockButton = screen.getByRole('button', { name: /buka/i });

      // Create error
      await user.type(pinInput, '9999');
      await user.click(unlockButton);

      await waitFor(() => {
        expect(screen.getByText(/pin\/password salah/i)).toBeInTheDocument();
      });

      // Clear error by typing
      await user.clear(pinInput);
      await user.type(pinInput, '1');

      await waitFor(() => {
        expect(screen.queryByText(/pin\/password salah/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and ARIA attributes', () => {
      renderPINLock();

      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      expect(pinInput).toHaveAttribute('type', 'number');
      expect(pinInput).toHaveAttribute('required');
    });

    it('should autofocus PIN input on mount', () => {
      renderPINLock();

      const pinInput = screen.getByLabelText(/pin 4 angka/i);
      expect(pinInput).toHaveAttribute('autoFocus');
    });
  });
});