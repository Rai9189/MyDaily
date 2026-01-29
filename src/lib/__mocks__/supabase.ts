// src/lib/__mocks__/supabase.ts
import { vi } from 'vitest';

export const supabase = {
  auth: {
    getSession: vi.fn(() =>
      Promise.resolve({
        data: { session: null },
        error: null,
      })
    ),
    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })),
    signUp: vi.fn(() =>
      Promise.resolve({
        data: { user: { id: 'test-user-id' }, session: null },
        error: null,
      })
    ),
    signInWithPassword: vi.fn(() =>
      Promise.resolve({
        data: { user: { id: 'test-user-id' }, session: { access_token: 'token' } },
        error: null,
      })
    ),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'test/path' }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file' } })),
      remove: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
};

export const handleSupabaseError = vi.fn((error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message;
  }
  return 'An unknown error occurred';
});

export const uploadFile = vi.fn(() =>
  Promise.resolve({
    url: 'https://test.com/file',
    path: 'test/path',
    error: null,
  })
);

export const deleteFile = vi.fn(() =>
  Promise.resolve({ success: true, error: null })
);

export const deleteFiles = vi.fn(() =>
  Promise.resolve({ success: true, error: null })
);

// ✅ FIXED: Proper implementation with timestamp
let callCount = 0;
export const generateUniqueFileName = vi.fn((name: string) => {
  const timestamp = Date.now() + callCount++;
  const extension = name.split('.').pop();
  const baseName = name.substring(0, name.lastIndexOf('.'));
  return `${baseName}-${timestamp}.${extension}`;
});

// ✅ FIXED: Proper implementation
export const getFileExtension = vi.fn((filename: string) => {
  if (!filename.includes('.')) return '';
  return filename.split('.').pop()?.toLowerCase() || '';
});

// ✅ FIXED: Proper implementation checking actual extensions
export const isImageFile = vi.fn((filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
});

// ✅ FIXED: Proper implementation with size calculation
export const formatFileSize = vi.fn((bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const size = bytes / Math.pow(k, i);
  const formattedSize = i === 0 ? size.toString() : size.toFixed(2);
  
  return `${formattedSize} ${sizes[i]}`;
});

export default supabase;