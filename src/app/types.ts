// Types untuk aplikasi MyDaily dengan Supabase compatibility

export type AccountType = 'Bank' | 'E-Wallet' | 'Cash';

export interface Account {
  id?: string; // Optional untuk create
  user_id?: string; // Akan di-set otomatis dari auth
  name: string;
  type: AccountType;
  balance: number;
  created_at?: string;
  updated_at?: string;
}

export type TransactionType = 'Masuk' | 'Keluar';

export interface Category {
  id?: string;
  user_id?: string;
  name: string;
  type: 'transaction' | 'task' | 'note';
  color?: string;
  created_at?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  url: string;
}

export interface Transaction {
  id?: string;
  user_id?: string;
  account_id: string;
  amount: number;
  type: TransactionType;
  date: string;
  category_id: string;
  description?: string;
  attachments?: Attachment[];
  deleted?: boolean;
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type TaskStatus = 'Masih Lama' | 'Mendekati' | 'Mendesak';

export interface Task {
  id?: string;
  user_id?: string;
  title: string;
  deadline: string;
  status: TaskStatus;
  completed: boolean;
  category_id: string;
  description?: string;
  completion_note?: string;
  completion_attachments?: Attachment[];
  deleted?: boolean;
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Note {
  id?: string;
  user_id?: string;
  title: string;
  content: string;
  timestamp?: string; // Akan jadi created_at di database
  pinned: boolean;
  category_id: string;
  attachments?: Attachment[];
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  pin_type?: 'pin4' | 'pin6' | 'password';
  pin_hash?: string;
  created_at?: string;
  updated_at?: string;
}

// Legacy types (keep for backward compatibility)
export type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';

// Supabase-specific types
export interface SupabaseProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  pin_type: 'pin4' | 'pin6' | 'password' | null;
  pin_hash: string | null;
  created_at: string;
  updated_at: string;
}

// Helper type untuk convert camelCase ke snake_case
export type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;