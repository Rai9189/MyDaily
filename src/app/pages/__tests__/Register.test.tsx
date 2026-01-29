  // src/app/pages/__tests__/Register.test.tsx
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { screen, waitFor } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { render } from '../../../test/utils';
  import { Register } from '../Register';

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

  describe('Register Component', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockSignUp.mockResolvedValue({ success: true, error: null });
    });

    describe('Rendering', () => {
      it('should render registration form with all fields', () => {
        render(<Register />);

        expect(screen.getByText('Daftar Akun')).toBeInTheDocument();
        expect(screen.getByLabelText(/nama lengkap/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/konfirmasi password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /daftar/i })).toBeInTheDocument();
      });

      it('should render back button', () => {
        render(<Register />);

        const backButton = screen.getAllByRole('button')[0]; // First button
        expect(backButton).toBeInTheDocument();
      });

      it('should render link to login page', () => {
        render(<Register />);

        expect(screen.getByText(/sudah punya akun/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
      });
    });

    describe('Form Validation', () => {
      it('should show error when password is less than 8 characters', async () => {
        const user = userEvent.setup();
        render(<Register />);

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
        render(<Register />);

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
        render(<Register />);

        const submitButton = screen.getByRole('button', { name: /daftar/i });
        await user.click(submitButton);

        // HTML5 validation should prevent submission
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    describe('Password Visibility Toggle', () => {
      it('should toggle password visibility', async () => {
        const user = userEvent.setup();
        render(<Register />);

        const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
        expect(passwordInput.type).toBe('password');

        // Find toggle button in password field container
        const passwordContainer = passwordInput.closest('div');
        const toggleButtons = passwordContainer?.querySelectorAll('button[type="button"]');
        
        if (toggleButtons && toggleButtons.length > 0) {
          await user.click(toggleButtons[0]);
          expect(passwordInput.type).toBe('text');

          await user.click(toggleButtons[0]);
          expect(passwordInput.type).toBe('password');
        }
      });

      it('should toggle confirm password visibility', async () => {
        const user = userEvent.setup();
        render(<Register />);

        const confirmPasswordInput = screen.getByLabelText(/konfirmasi password/i) as HTMLInputElement;
        expect(confirmPasswordInput.type).toBe('password');

        // Find toggle button in confirm password field container
        const confirmContainer = confirmPasswordInput.closest('div');
        const toggleButtons = confirmContainer?.querySelectorAll('button[type="button"]');
        
        if (toggleButtons && toggleButtons.length > 0) {
          await user.click(toggleButtons[0]);
          expect(confirmPasswordInput.type).toBe('text');

          await user.click(toggleButtons[0]);
          expect(confirmPasswordInput.type).toBe('password');
        }
      });
    });

    describe('Registration Flow', () => {
      it('should successfully register with valid credentials', async () => {
        const user = userEvent.setup();
        mockSignUp.mockResolvedValue({ success: true, error: null });
        
        render(<Register />);

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
        
        render(<Register />);

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
        
        render(<Register />);

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
        render(<Register />);

        const loginButton = screen.getByRole('button', { name: /masuk/i });
        await user.click(loginButton);

        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      it('should navigate to login when clicking back button', async () => {
        const user = userEvent.setup();
        render(<Register />);

        const backButton = screen.getAllByRole('button')[0]; // First button is back
        await user.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    describe('Accessibility', () => {
      it('should have proper labels for all form inputs', () => {
        render(<Register />);

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
        
        render(<Register />);

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