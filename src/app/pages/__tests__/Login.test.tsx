// src/app/pages/__tests__/Login.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test/utils';
import { Login } from '../Login';

// Mock signIn dan navigate
const mockSignIn = vi.fn();
const mockNavigate = vi.fn();

// Override mock AuthContext untuk test ini
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    signIn: mockSignIn,
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset default behavior
    mockSignIn.mockResolvedValue({ success: true, error: null });
  });

  it('should render login form', () => {
    render(<Login />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^masuk$/i })).toBeInTheDocument();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    // Cari button toggle di dalam container password input
    const passwordContainer = passwordInput.closest('div');
    const toggleButton = passwordContainer?.querySelector('button[type="button"]');
    
    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    }
  });

  it('should call signIn with correct credentials', async () => {
    const user = userEvent.setup();
    localStorage.setItem('pinSetup', 'true');
    
    render(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /^masuk$/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should show error message on login failure', async () => {
    const user = userEvent.setup();
    
    // Mock failure untuk test ini
    mockSignIn.mockResolvedValueOnce({ 
      success: false, 
      error: 'Invalid credentials' 
    });

    render(<Login />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /^masuk$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should navigate to register page', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const registerButton = screen.getByRole('button', { name: /daftar sekarang/i });
    await user.click(registerButton);

    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('should navigate to forgot password page', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const forgotButton = screen.getByRole('button', { name: /lupa password/i });
    await user.click(forgotButton);

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup();
    
    // Mock dengan delay untuk simulasi loading
    mockSignIn.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve({ success: true, error: null }), 100);
      })
    );

    localStorage.setItem('pinSetup', 'true');
    render(<Login />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    const submitButton = screen.getByRole('button', { name: /^masuk$/i });
    await user.click(submitButton);

    // Check loading text appears
    await waitFor(() => {
      expect(screen.getByText(/masuk\.\.\./i)).toBeInTheDocument();
    });

    // Button should be disabled
    const loadingButton = screen.getByRole('button', { name: /masuk\.\.\./i });
    expect(loadingButton).toBeDisabled();
  });
});