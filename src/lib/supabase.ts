import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// Ambil environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validasi environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// Helper function untuk handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui';
  
  // Auth errors
  if (error.message?.includes('Invalid login credentials')) {
    return 'Email atau password salah';
  }
  if (error.message?.includes('User already registered')) {
    return 'Email sudah terdaftar';
  }
  if (error.message?.includes('Email not confirmed')) {
    return 'Email belum diverifikasi. Cek inbox Anda';
  }
  
  // Database errors
  if (error.code === '23505') {
    return 'Data sudah ada';
  }
  if (error.code === '23503') {
    return 'Data terkait tidak ditemukan';
  }
  
  // Generic error
  return error.message || 'Terjadi kesalahan';
};

// Helper function untuk log errors (development only)
export const logError = (context: string, error: any) => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
};