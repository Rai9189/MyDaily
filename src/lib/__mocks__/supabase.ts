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

export const generateUniqueFileName = vi.fn((name: string) => `unique-${name}`);

export const getFileExtension = vi.fn((filename: string) => 
  filename.split('.').pop()?.toLowerCase() || ''
);

export const isImageFile = vi.fn(() => true);

export const formatFileSize = vi.fn(() => '1 MB');

export default supabase;