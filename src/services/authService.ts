import { supabase, handleSupabaseError, logError } from '../lib/supabase';
import { hashPin, verifyPin } from '../utils/pinEncryption';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { SupabaseProfile } from '../app/types';

/**
 * Auth Service
 * Business logic untuk authentication & user management
 */

// ============================================
// REGISTER & LOGIN
// ============================================

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Register user baru
 */
export async function registerUser(data: RegisterData) {
  try {
    // 1. Sign up dengan Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name, // Akan digunakan di trigger handle_new_user
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // 2. Profile otomatis dibuat oleh trigger
    // 3. Categories otomatis dibuat oleh trigger
    
    return {
      user: authData.user,
      session: authData.session,
    };
  } catch (error: any) {
    logError('registerUser', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Login user
 */
export async function loginUser(data: LoginData) {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    if (!authData.user) throw new Error('Login failed');

    return {
      user: authData.user,
      session: authData.session,
    };
  } catch (error: any) {
    logError('loginUser', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Logout user
 */
export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error: any) {
    logError('logoutUser', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  } catch (error: any) {
    logError('sendPasswordResetEmail', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Update password (setelah reset)
 */
export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  } catch (error: any) {
    logError('updatePassword', error);
    throw new Error(handleSupabaseError(error));
  }
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<SupabaseProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('getUserProfile', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<SupabaseProfile>
) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('updateUserProfile', error);
    throw new Error(handleSupabaseError(error));
  }
}

// ============================================
// PIN MANAGEMENT
// ============================================

/**
 * Check if user has PIN setup
 */
export async function checkPinExists(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('pin_hash')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return !!data?.pin_hash;
  } catch (error: any) {
    logError('checkPinExists', error);
    return false;
  }
}

/**
 * Setup PIN untuk user
 */
export async function setupPin(
  userId: string,
  pin: string,
  pinType: 'pin4' | 'pin6' | 'password'
) {
  try {
    // Hash PIN
    const pinHash = await hashPin(pin);

    // Save ke database
    const { data, error } = await supabase
      .from('profiles')
      .update({
        pin_type: pinType,
        pin_hash: pinHash,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('setupPin', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Verify PIN user
 */
export async function verifyUserPin(userId: string, pin: string): Promise<boolean> {
  try {
    // Get stored hash
    const { data, error } = await supabase
      .from('profiles')
      .select('pin_hash')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data?.pin_hash) return false;

    // Verify PIN
    return await verifyPin(pin, data.pin_hash);
  } catch (error: any) {
    logError('verifyUserPin', error);
    return false;
  }
}

/**
 * Update PIN user
 */
export async function updatePin(
  userId: string,
  oldPin: string,
  newPin: string,
  newPinType: 'pin4' | 'pin6' | 'password'
) {
  try {
    // Verify old PIN first
    const isOldPinValid = await verifyUserPin(userId, oldPin);
    if (!isOldPinValid) {
      throw new Error('PIN lama salah');
    }

    // Hash new PIN
    const newPinHash = await hashPin(newPin);

    // Update database
    const { data, error } = await supabase
      .from('profiles')
      .update({
        pin_type: newPinType,
        pin_hash: newPinHash,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('updatePin', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Reset PIN (forgot PIN - requires email verification)
 */
export async function resetPin(userId: string) {
  try {
    // Remove PIN dari database
    const { data, error } = await supabase
      .from('profiles')
      .update({
        pin_type: null,
        pin_hash: null,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    logError('resetPin', error);
    throw new Error(handleSupabaseError(error));
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get current session
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (error: any) {
    logError('getCurrentSession', error);
    return null;
  }
}

/**
 * Refresh session
 */
export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  } catch (error: any) {
    logError('refreshSession', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session;
}