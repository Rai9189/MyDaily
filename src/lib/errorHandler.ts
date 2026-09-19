/**
 * Centralized error handling utilities for context mutations
 * Eliminates repeated try/catch boilerplate across all data contexts
 * Handles error sanitization, state updates, and consistent return signatures
 */

import { handleSupabaseError } from './supabase';

export interface ErrorResult {
  success: boolean;
  error: string | null;
}

export interface ErrorResultWithData<T> extends ErrorResult {
  data?: T;
}

/**
 * Wraps async operations with standardized error handling
 * Automatically catches errors, sanitizes them, updates context state, and returns result
 *
 * @param operation - Async function that performs the mutation (e.g., Supabase query)
 * @param options - Configuration for error handling
 * @returns Promise resolving to { success, error } or { success, data, error }
 *
 * @example
 * const result = await withErrorHandling(
 *   () => supabase.from('accounts').insert([{ name: 'Checking' }]),
 *   { setError }
 * );
 * if (result.success) { ... } else { toast.error(result.error); }
 */
export async function withErrorHandling<T = void>(
  operation: () => PromiseLike<{ data: T | null; error: any }>,
  options: {
    setError?: (error: string) => void;
    context?: 'signin' | 'signup' | 'general';
  } = {}
): Promise<ErrorResultWithData<T>> {
  const { setError, context = 'general' } = options;

  try {
    const { data, error: supabaseError } = await operation();

    // Supabase query-level error
    if (supabaseError) throw supabaseError;

    return { success: true, data: data || undefined, error: null };
  } catch (err) {
    const errorMessage = handleSupabaseError(err, context);
    if (setError) setError(errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Variant for operations that don't return data (e.g., delete, update)
 * Same as withErrorHandling but clearer intent for mutations without a return value
 */
export async function withErrorHandlingNoData(
  operation: () => PromiseLike<{ error: any }>,
  options: {
    setError?: (error: string) => void;
    context?: 'signin' | 'signup' | 'general';
  } = {}
): Promise<ErrorResult> {
  const { setError, context = 'general' } = options;

  try {
    const { error: supabaseError } = await operation();

    if (supabaseError) throw supabaseError;

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = handleSupabaseError(err, context);
    if (setError) setError(errorMessage);
    return { success: false, error: errorMessage };
  }
}
