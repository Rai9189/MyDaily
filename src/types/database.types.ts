// Database Types untuk Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          avatar: string | null
          pin_type: 'pin4' | 'pin6' | 'password' | null
          pin_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          avatar?: string | null
          pin_type?: 'pin4' | 'pin6' | 'password' | null
          pin_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          avatar?: string | null
          pin_type?: 'pin4' | 'pin6' | 'password' | null
          pin_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'Bank' | 'E-Wallet' | 'Cash'
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'Bank' | 'E-Wallet' | 'Cash'
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'Bank' | 'E-Wallet' | 'Cash'
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'transaction' | 'task' | 'note'
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'transaction' | 'task' | 'note'
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'transaction' | 'task' | 'note'
          color?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string
          amount: number
          type: 'Masuk' | 'Keluar'
          date: string
          description: string | null
          attachments: Json
          deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id: string
          amount: number
          type: 'Masuk' | 'Keluar'
          date?: string
          description?: string | null
          attachments?: Json
          deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string
          amount?: number
          type?: 'Masuk' | 'Keluar'
          date?: string
          description?: string | null
          attachments?: Json
          deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          category_id: string
          title: string
          description: string | null
          deadline: string
          status: 'Masih Lama' | 'Mendekati' | 'Mendesak'
          completed: boolean
          completion_note: string | null
          completion_attachments: Json
          deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          title: string
          description?: string | null
          deadline: string
          status?: 'Masih Lama' | 'Mendekati' | 'Mendesak'
          completed?: boolean
          completion_note?: string | null
          completion_attachments?: Json
          deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          title?: string
          description?: string | null
          deadline?: string
          status?: 'Masih Lama' | 'Mendekati' | 'Mendesak'
          completed?: boolean
          completion_note?: string | null
          completion_attachments?: Json
          deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          category_id: string
          title: string
          content: string
          pinned: boolean
          attachments: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          title: string
          content: string
          pinned?: boolean
          attachments?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          title?: string
          content?: string
          pinned?: boolean
          attachments?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_task_status: {
        Args: { deadline_date: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}