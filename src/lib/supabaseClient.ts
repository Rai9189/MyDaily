// Re-export supabase client untuk kemudahan import
export { supabase, handleSupabaseError, logError } from './supabase';

// Export types jika dibutuhkan
export type { Session, User, AuthError } from '@supabase/supabase-js';