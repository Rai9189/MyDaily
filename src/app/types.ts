// Types untuk aplikasi MyDaily

export type AccountType = 'Bank' | 'E-Wallet' | 'Cash';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
}

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: 'transaction' | 'task' | 'note';
  color?: string;
  subtype?: string;
  parentId?: string | null;
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
  subcategoryId?: string | null;
  description?: string;
  attachments?: Attachment[];
}

export type TaskStatus = 'on_track' | 'upcoming' | 'urgent' | 'overdue';

export interface Task {
  id: string;
  title: string;
  deadline: string;
  status: TaskStatus;
  completed: boolean;
  categoryId: string;
  subcategoryId?: string | null;
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
  subcategoryId?: string | null;
  attachments?: Attachment[];
}

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