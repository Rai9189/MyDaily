// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Export types for TypeScript
export type { User, Session } from '@supabase/supabase-js';

// ============================================
// SECURITY: Obscure error messages
// Pesan error dari Supabase bisa mengungkap info sensitif
// (misal: "User not found" → attacker tahu email tidak terdaftar)
// Semua error auth disamarkan menjadi pesan generik.
// ============================================

// Daftar pesan Supabase yang perlu disamarkan
const OBSCURE_AUTH_ERRORS = [
  'invalid login credentials',
  'invalid password',
  'user not found',
  'email not confirmed',
  'invalid email or password',
  'no user found with that email',
  'wrong password',
  'password is incorrect',
  'invalid credentials',
  'email already in use',         // Jangan beri tahu email sudah terdaftar
  'user already registered',
  'email address is already registered',
];

const GENERIC_AUTH_ERROR = 'Invalid email or password.';
const GENERIC_SIGNUP_ERROR = 'Registration failed. Please try again.';

export function handleSupabaseError(error: unknown, context: 'signin' | 'signup' | 'general' = 'general'): string {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return 'An unknown error occurred';
  }

  const message = (error as { message: string }).message.toLowerCase();

  // Samarkan semua error autentikasi yang sensitif
  const isAuthError = OBSCURE_AUTH_ERRORS.some(pattern => message.includes(pattern));
  if (isAuthError) {
    if (context === 'signup') return GENERIC_SIGNUP_ERROR;
    return GENERIC_AUTH_ERROR;
  }

  // Error jaringan / server
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return 'Connection error. Please check your internet and try again.';
  }

  // Error rate limit dari Supabase server-side
  if (message.includes('too many requests') || message.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  // Error umum yang aman ditampilkan
  return (error as { message: string }).message;
}

// ============================================
// FILE UPLOAD HELPERS
// ============================================

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; path: string | null; error: string | null }> {
  try {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { url: null, path: null, error: 'File terlalu besar. Maksimal 10MB.' };
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return { url: null, path: null, error: 'Tipe file tidak didukung. Hanya gambar (JPEG, PNG, GIF, WebP) dan PDF.' };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) return { url: null, path: null, error: error.message };

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: urlData.publicUrl, path: data.path, error: null };
  } catch (error) {
    return { url: null, path: null, error: handleSupabaseError(error) };
  }
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: handleSupabaseError(error) };
  }
}

export async function deleteFiles(
  bucket: string,
  paths: string[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: handleSupabaseError(error) };
  }
}

export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  return imageExtensions.includes(getFileExtension(filename));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default supabase;