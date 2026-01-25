// src/app/pages/__tests__/Register.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { Register } from '../Register';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockSignUp = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    loading: false,
  }),
}));

const renderRegister = () => {
  return render(
    <BrowserRouter>
      <Register />
    </BrowserRouter>
  );
};

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render registration form with all fields', () => {
      renderRegister();

      expect(screen.getByText('Daftar Akun')).toBeInTheDocument();
      expect(screen.getByLabelText(/nama lengkap/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/konfirmasi password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /daftar/i })).toBeInTheDocument();
    });

    it('should render back button', () => {
      renderRegister();

      const backButton = screen.getByRole('button', { name: '' }); // ArrowLeft icon button
      expect(backButton).toBeInTheDocument();
    });

    it('should render link to login page', () => {
      renderRegister();

      expect(screen.getByText(/sudah punya akun/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when password is less than 8 characters', async () => {
      const user = userEvent.setup();
      renderRegister();

      await user.type(screen.getByLabelText(/nama lengkap/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'short');
      await user.type(screen.getByLabelText(/konfirmasi password/i), 'short');
      
      await user.click(screen.getByRole('button', { name: /daftar/i }));

      await waitFor(() => {
        expect(screen.getByText(/password minimal 8 karakter/i)).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegister();

      await user.type(screen.getByLabelText(/nama lengkap/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/konfirmasi password/i), 'different123');
      
      await user.click(screen.getByRole('button', { name: /daftar/i }));

      await waitFor(() => {
        expect(screen.getByText(/password tidak cocok/i)).toBeInTheDocument();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('should require all fields to be filled', async () => {
      const user = userEvent.setup();
      renderRegister();

      const submitButton = screen.getByRole('button', { name: /daftar/i });
      await user.click(submitButton);

      // HTML5 validation should prevent submission
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      renderRegister();

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      // Find and click the first eye icon (password field)
      const eyeButtons = screen.getAllByRole('button', { name: '' });
      const passwordToggle = eyeButtons.find(btn => 
        btn.querySelector('svg') && btn.closest('div')?.querySelector('#password')
      );
      
      if (passwordToggle) {
        await user.click(passwordToggle);
        expect(passwordInput.type).toBe('text');

        await user.click(passwordToggle);
        expect(passwordInput.type).toBe('password');
      }
    });

    it('should toggle confirm password visibility', async () => {
      const user = userEvent.setup();
      renderRegister();

      const confirmPasswordInput = screen.getByLabelText(/konfirmasi password/i) as HTMLInputElement;
      expect(confirmPasswordInput.type).toBe('password');

      // Find and click the second eye icon (confirm password field)
      const eyeButtons = screen.getAllByRole('button', { name: '' });
      const confirmToggle = eyeButtons.find(btn => 
        btn.querySelector('svg') && btn.closest('div')?.querySelector('#confirmPassword')
      );
      
      if (confirmToggle) {
        await user.click(confirmToggle);
        expect(confirmPasswordInput.type).toBe('text');

        await user.click(confirmToggle);
        expect(confirmPasswordInput.type).toBe('password');
      }
    });
  });

  describe('Registration Flow', () => {
    it('should successfully register with valid credentials', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ success: true, error: null });
      
      renderRegister();

      await user.type(screen.getByLabelText(/nama lengkap/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/konfirmasi password/i), 'password123');

      await user.click(screen.getByRole('button', { name: /daftar/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe');
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/pin-setup');
      });
    });

    it('should display error message when registration fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Email already exists';
      mockSignUp.mockResolvedValue({ success: false, error: errorMessage });
      
      renderRegister();

      await user.type(screen.getByLabelText(/nama lengkap/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/konfirmasi password/i), 'password123');

      await user.click(screen.getByRole('button', { name: /daftar/i }));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show loading state during registration', async () => {
      const user = userEvent.setup();
      let resolveSignUp: any;
      const signUpPromise = new Promise((resolve) => {
        resolveSignUp = resolve;
      });
      mockSignUp.mockReturnValue(signUpPromise);
      
      renderRegister();

      await user.type(screen.getByLabelText(/nama lengkap/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/konfirmasi password/i), 'password123');

      await user.click(screen.getByRole('button', { name: /daftar/i }));

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/mendaftar/i)).toBeInTheDocument();
      });

      // Resolve the promise
      resolveSignUp({ success: true, error: null });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/pin-setup');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to login when clicking login link', async () => {
      const user = userEvent.setup();
      renderRegister();

      const loginButton = screen.getByRole('button', { name: /masuk/i });
      await user.click(loginButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should navigate to login when clicking back button', async () => {
      const user = userEvent.setup();
      renderRegister();

      const backButton = screen.getAllByRole('button')[0]; // First button is back
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form inputs', () => {
      renderRegister();

      expect(screen.getByLabelText(/nama lengkap/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/konfirmasi password/i)).toBeInTheDocument();
    });

    it('should disable form during submission', async () => {
      const user = userEvent.setup();
      let resolveSignUp: any;
      const signUpPromise = new Promise((resolve) => {
        resolveSignUp = resolve;
      });
      mockSignUp.mockReturnValue(signUpPromise);
      
      renderRegister();

      await user.type(screen.getByLabelText(/nama lengkap/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/konfirmasi password/i), 'password123');

      await user.click(screen.getByRole('button', { name: /daftar/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /mendaftar/i });
        expect(submitButton).toBeDisabled();
      });

      resolveSignUp({ success: true, error: null });
    });
  });
});