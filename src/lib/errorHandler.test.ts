import { describe, it, expect, vi } from 'vitest';
import { withErrorHandling, withErrorHandlingNoData } from './errorHandler';

describe('errorHandler utilities', () => {
  describe('withErrorHandling', () => {
    it('returns success with data when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValueOnce({ data: { id: '1', name: 'Test' }, error: null });
      const result = await withErrorHandling(operation);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '1', name: 'Test' });
      expect(result.error).toBe(null);
    });

    it('returns success with undefined data when operation returns null data', async () => {
      const operation = vi.fn().mockResolvedValueOnce({ data: null, error: null });
      const result = await withErrorHandling(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe(null);
    });

    it('returns failure when Supabase query returns error', async () => {
      const operation = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'invalid login credentials' },
      });
      const setError = vi.fn();
      const result = await withErrorHandling(operation, { setError, context: 'signin' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password.');
      expect(setError).toHaveBeenCalledWith('Invalid email or password.');
    });

    it('catches thrown errors and sanitizes them', async () => {
      const operation = vi.fn().mockRejectedValueOnce(new Error('user not found'));
      const setError = vi.fn();
      const result = await withErrorHandling(operation, { setError });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid/i); // Sanitized message
      expect(setError).toHaveBeenCalled();
    });

    it('calls setError with sanitized message on error', async () => {
      const operation = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'email already in use' },
      });
      const setError = vi.fn();
      await withErrorHandling(operation, { setError, context: 'signup' });

      expect(setError).toHaveBeenCalledWith('Registration failed. Please try again.');
    });

    it('returns generic error for unknown errors', async () => {
      const operation = vi.fn().mockRejectedValueOnce(null);
      const result = await withErrorHandling(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unknown error occurred');
    });

    it('respects context parameter for different error messages', async () => {
      const operation = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'invalid password' },
      });

      const signupResult = await withErrorHandling(operation, { context: 'signup' });
      expect(signupResult.error).toBe('Registration failed. Please try again.');

      const signinResult = await withErrorHandling(operation, { context: 'signin' });
      expect(signinResult.error).toBe('Invalid email or password.');
    });
  });

  describe('withErrorHandlingNoData', () => {
    it('returns success when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValueOnce({ error: null });
      const result = await withErrorHandlingNoData(operation);

      expect(result.success).toBe(true);
      expect(result.error).toBe(null);
    });

    it('returns failure when Supabase operation returns error', async () => {
      const operation = vi.fn().mockResolvedValueOnce({ error: { message: 'permission denied' } });
      const setError = vi.fn();
      const result = await withErrorHandlingNoData(operation, { setError });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/permission/i);
      expect(setError).toHaveBeenCalled();
    });

    it('catches thrown errors', async () => {
      const operation = vi.fn().mockRejectedValueOnce(new Error('network error'));
      const result = await withErrorHandlingNoData(operation);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/connection|network/i);
    });

    it('does not return data field', async () => {
      const operation = vi.fn().mockResolvedValueOnce({ error: null });
      const result = await withErrorHandlingNoData(operation);

      expect(result).not.toHaveProperty('data');
      expect(result).toEqual({ success: true, error: null });
    });
  });
});
