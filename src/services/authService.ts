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
 * Register user baru dengan manual profile & categories creation
 */
export async function registerUser(data: RegisterData) {
  try {
    console.log('📝 [registerUser] Starting registration for:', data.email);
    
    // 1. Sign up dengan Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    console.log('✅ [registerUser] Auth user created:', authData.user.id);

    // 2. MANUAL: Insert profile (bypass trigger karena sering error)
    try {
      console.log('📝 [registerUser] Creating profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: data.name,
          email: data.email,
        });

      if (profileError && profileError.code !== '23505') {
        // 23505 = duplicate key (profile sudah ada dari trigger)
        console.error('❌ [registerUser] Profile creation error:', profileError);
      } else {
        console.log('✅ [registerUser] Profile created');
      }
    } catch (profileErr) {
      console.error('❌ [registerUser] Profile insert failed:', profileErr);
    }

    // 3. MANUAL: Insert default categories
    try {
      console.log('📝 [registerUser] Creating default categories...');
      const defaultCategories = [
        // Transaction categories
        { name: 'Gaji', type: 'transaction', color: '#10b981' },
        { name: 'Sewa', type: 'transaction', color: '#ef4444' },
        { name: 'Transportasi', type: 'transaction', color: '#f59e0b' },
        { name: 'Belanja', type: 'transaction', color: '#8b5cf6' },
        { name: 'Top Up', type: 'transaction', color: '#06b6d4' },
        { name: 'Makanan', type: 'transaction', color: '#ec4899' },
        { name: 'Hiburan', type: 'transaction', color: '#14b8a6' },
        { name: 'Kesehatan', type: 'transaction', color: '#10b981' },
        { name: 'Lainnya', type: 'transaction', color: '#6b7280' },
        // Task categories
        { name: 'Tagihan', type: 'task', color: '#ef4444' },
        { name: 'Administrasi', type: 'task', color: '#f59e0b' },
        { name: 'Kesehatan', type: 'task', color: '#10b981' },
        { name: 'Pekerjaan', type: 'task', color: '#3b82f6' },
        { name: 'Rumah Tangga', type: 'task', color: '#8b5cf6' },
        { name: 'Pribadi', type: 'task', color: '#06b6d4' },
        // Note categories
        { name: 'Penting', type: 'note', color: '#ef4444' },
        { name: 'Belanja', type: 'note', color: '#10b981' },
        { name: 'Rencana', type: 'note', color: '#3b82f6' },
        { name: 'Resep', type: 'note', color: '#f59e0b' },
        { name: 'Ide', type: 'note', color: '#8b5cf6' },
        { name: 'Catatan', type: 'note', color: '#6b7280' },
      ];

      const categoriesToInsert = defaultCategories.map(cat => ({
        ...cat,
        user_id: authData.user.id,
      }));

      const { error: categoriesError } = await supabase
        .from('categories')
        .insert(categoriesToInsert);

      if (categoriesError && categoriesError.code !== '23505') {
        console.error('❌ [registerUser] Categories creation error:', categoriesError);
      } else {
        console.log('✅ [registerUser] Categories created');
      }
    } catch (categoriesErr) {
      console.error('❌ [registerUser] Categories insert failed:', categoriesErr);
    }

    console.log('✅ [registerUser] Registration complete');
    return {
      user: authData.user,
      session: authData.session,
    };
  } catch (error: any) {
    console.error('❌ [registerUser] Error:', error);
    logError('registerUser', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Login user
 */
export async function loginUser(data: LoginData) {
  try {
    console.log('🔑 [loginUser] Logging in:', data.email);
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    if (!authData.user) throw new Error('Login failed');

    console.log('✅ [loginUser] Login successful:', authData.user.email);
    return {
      user: authData.user,
      session: authData.session,
    };
  } catch (error: any) {
    console.error('❌ [loginUser] Error:', error);
    logError('loginUser', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Logout user
 */
export async function logoutUser() {
  try {
    console.log('👋 [logoutUser] Logging out...');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log('✅ [logoutUser] Logout successful');
  } catch (error: any) {
    console.error('❌ [logoutUser] Error:', error);
    logError('logoutUser', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
  try {
    console.log('🔄 [sendPasswordResetEmail] Sending reset email to:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    console.log('✅ [sendPasswordResetEmail] Email sent');
  } catch (error: any) {
    console.error('❌ [sendPasswordResetEmail] Error:', error);
    logError('sendPasswordResetEmail', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Update password (setelah reset)
 */
export async function updatePassword(newPassword: string) {
  try {
    console.log('🔄 [updatePassword] Updating password...');
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    console.log('✅ [updatePassword] Password updated');
  } catch (error: any) {
    console.error('❌ [updatePassword] Error:', error);
    logError('updatePassword', error);
    throw new Error(handleSupabaseError(error));
  }
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Get user profile dengan detailed logging
 */
export async function getUserProfile(userId: string): Promise<SupabaseProfile | null> {
  console.log('🔍 [getUserProfile] START - User ID:', userId);
  
  try {
    console.log('📡 [getUserProfile] Making Supabase query...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('📦 [getUserProfile] Response:', { data, error });

    if (error) {
      console.error('❌ [getUserProfile] Supabase error:', error);
      throw error;
    }
    
    if (!data) {
      console.warn('⚠️ [getUserProfile] No profile found for user:', userId);
      return null;
    }
    
    console.log('✅ [getUserProfile] SUCCESS - Profile:', data.name);
    return data;
  } catch (error: any) {
    console.error('❌ [getUserProfile] CATCH block:', error);
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
    console.log('📝 [updateUserProfile] Updating profile for:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ [updateUserProfile] Profile updated');
    return data;
  } catch (error: any) {
    console.error('❌ [updateUserProfile] Error:', error);
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
    console.log('🔍 [checkPinExists] Checking PIN for:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('pin_hash')
      .eq('id', userId)
      .single();

    if (error) throw error;
    const exists = !!data?.pin_hash;
    console.log('✅ [checkPinExists] PIN exists:', exists);
    return exists;
  } catch (error: any) {
    console.error('❌ [checkPinExists] Error:', error);
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
    console.log('🔐 [setupPin] Setting up PIN for:', userId);
    
    // Hash PIN
    const pinHash = await hashPin(pin);
    console.log('🔐 [setupPin] PIN hashed');

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
    console.log('✅ [setupPin] PIN setup complete');
    return data;
  } catch (error: any) {
    console.error('❌ [setupPin] Error:', error);
    logError('setupPin', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Verify PIN user
 */
export async function verifyUserPin(userId: string, pin: string): Promise<boolean> {
  try {
    console.log('🔍 [verifyUserPin] Verifying PIN for:', userId);
    
    // Get stored hash
    const { data, error } = await supabase
      .from('profiles')
      .select('pin_hash')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data?.pin_hash) {
      console.warn('⚠️ [verifyUserPin] No PIN hash found');
      return false;
    }

    // Verify PIN
    const isValid = await verifyPin(pin, data.pin_hash);
    console.log('✅ [verifyUserPin] PIN valid:', isValid);
    return isValid;
  } catch (error: any) {
    console.error('❌ [verifyUserPin] Error:', error);
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
    console.log('🔄 [updatePin] Updating PIN for:', userId);
    
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
    console.log('✅ [updatePin] PIN updated');
    return data;
  } catch (error: any) {
    console.error('❌ [updatePin] Error:', error);
    logError('updatePin', error);
    throw new Error(handleSupabaseError(error));
  }
}

/**
 * Reset PIN (forgot PIN - requires email verification)
 */
export async function resetPin(userId: string) {
  try {
    console.log('🔄 [resetPin] Resetting PIN for:', userId);
    
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
    console.log('✅ [resetPin] PIN reset');
    return data;
  } catch (error: any) {
    console.error('❌ [resetPin] Error:', error);
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