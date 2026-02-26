// Types untuk aplikasi MyDaily

export type AccountType = 'Bank' | 'E-Wallet' | 'Cash';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
}

export type TransactionType = 'Masuk' | 'Keluar';

export interface Category {
  id: string;
  name: string;
  type: 'transaction' | 'task' | 'note';
  color?: string;
  // ✅ FIX: subtype untuk filter category Income vs Expense
  // Isi 'income' untuk kategori pemasukan, 'expense' untuk pengeluaran
  // Jika tidak diisi, category akan tampil di kedua type transaksi
  subtype?: 'income' | 'expense';
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  url: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId: string;
  description?: string;
  attachments?: Attachment[];
}

export type TaskStatus = 'Masih Lama' | 'Mendekati' | 'Mendesak';

export interface Task {
  id: string;
  title: string;
  deadline: string;
  status: TaskStatus;
  completed: boolean;
  categoryId: string;
  description?: string;
  completionNote?: string;
  completionAttachments?: Attachment[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  pinned: boolean;
  categoryId: string;
  attachments?: Attachment[];
}

// ✅ FIX: Sesuaikan field User dengan kolom database (snake_case)
// Database columns: id, name, email, avatar, pin_type, pin_hash, created_at, updated_at
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  pin_type?: 'numeric' | 'password';
  pin_hash?: string;
  created_at?: string;
  updated_at?: string;
}

export type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';