// src/app/pages/__tests__/Login.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { Login } from '../Login';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useAuth
const mockSignIn = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    user: null,
    loading: false,
  }),
}));

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form', () => {
    render(<Login />);
    
    expect(screen.getByText('MyDaily')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    const toggleButton = screen.getByRole('button', { name: /toggle password/i });
    await user.click(toggleButton);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const submitButton = screen.getByRole('button', { name: /masuk/i });
    await user.click(submitButton);
    
    // HTML5 validation will prevent submission
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should call signIn with correct credentials', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ success: true, error: null });
    
    render(<Login />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /masuk/i }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should show error message on login failure', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ 
      success: false, 
      error: 'Invalid credentials' 
    });
    
    render(<Login />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /masuk/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should navigate to register page', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const registerLink = screen.getByRole('button', { name: /daftar sekarang/i });
    await user.click(registerLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('should navigate to forgot password page', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const forgotPasswordLink = screen.getByRole('button', { name: /lupa password/i });
    await user.click(forgotPasswordLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup();
    mockSignIn.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
    );
    
    render(<Login />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    const submitButton = screen.getByRole('button', { name: /masuk/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/masuk.../i)).toBeInTheDocument();
    });
  });
});