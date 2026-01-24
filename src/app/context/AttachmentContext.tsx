// src/app/context/AttachmentContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { supabase, handleSupabaseError, uploadFile, deleteFile, deleteFiles, generateUniqueFileName } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { Attachment } from '../types';

interface AttachmentContextType {
  uploadAttachment: (
    file: File,
    attachableType: 'transaction' | 'task' | 'note',
    attachableId: string
  ) => Promise<{ success: boolean; data?: Attachment; error: string | null }>;
  deleteAttachment: (id: string, storagePath: string) => Promise<{ success: boolean; error: string | null }>;
  getAttachments: (
    attachableType: 'transaction' | 'task' | 'note',
    attachableId: string
  ) => Promise<{ data: Attachment[] | null; error: string | null }>;
  deleteAllAttachments: (
    attachableType: 'transaction' | 'task' | 'note',
    attachableId: string
  ) => Promise<{ success: boolean; error: string | null }>;
}

const AttachmentContext = createContext<AttachmentContextType | undefined>(undefined);

export function AttachmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Upload attachment
  const uploadAttachment = async (
    file: File,
    attachableType: 'transaction' | 'task' | 'note',
    attachableId: string
  ) => {
    try {
      if (!user) throw new Error('User not authenticated');

      // Generate unique filename
      const uniqueFileName = generateUniqueFileName(file.name);
      const filePath = `${user.id}/${attachableType}/${attachableId}/${uniqueFileName}`;

      // Upload to Supabase Storage
      const { url, path, error: uploadError } = await uploadFile('attachments', filePath, file);

      if (uploadError || !url || !path) {
        throw new Error(uploadError || 'Upload failed');
      }

      // Determine file type
      const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';

      // Save to database
      const { data, error: dbError } = await supabase
        .from('attachments')
        .insert({
          user_id: user.id,
          attachable_type: attachableType,
          attachable_id: attachableId,
          name: file.name, // Original name for display
          original_name: file.name,
          type: fileType,
          url: url,
          size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return { success: true, data: data as Attachment, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      return { success: false, error: errorMessage };
    }
  };

  // Delete attachment
  const deleteAttachment = async (id: string, storagePath: string) => {
    try {
      // Extract path from URL if full URL is provided
      let actualPath = storagePath;
      if (storagePath.includes('/storage/v1/object/public/attachments/')) {
        actualPath = storagePath.split('/storage/v1/object/public/attachments/')[1];
      }

      // Delete from storage
      const { error: storageError } = await deleteFile('attachments', actualPath);
      if (storageError) {
        console.warn('Storage delete error:', storageError);
        // Continue to delete DB record even if storage delete fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      return { success: false, error: errorMessage };
    }
  };

  // Get attachments for an entity
  const getAttachments = async (
    attachableType: 'transaction' | 'task' | 'note',
    attachableId: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('attachable_type', attachableType)
        .eq('attachable_id', attachableId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { data: data as Attachment[], error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      return { data: null, error: errorMessage };
    }
  };

  // Delete all attachments for an entity (useful when deleting parent)
  const deleteAllAttachments = async (
    attachableType: 'transaction' | 'task' | 'note',
    attachableId: string
  ) => {
    try {
      // Get all attachments first
      const { data: attachments, error: fetchError } = await getAttachments(attachableType, attachableId);
      
      if (fetchError || !attachments || attachments.length === 0) {
        return { success: true, error: null }; // No attachments to delete
      }

      // Extract storage paths
      const storagePaths = attachments.map(att => {
        if (att.url.includes('/storage/v1/object/public/attachments/')) {
          return att.url.split('/storage/v1/object/public/attachments/')[1];
        }
        return att.url;
      });

      // Delete from storage
      await deleteFiles('attachments', storagePaths);

      // Delete from database
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('attachable_type', attachableType)
        .eq('attachable_id', attachableId);

      if (dbError) throw dbError;

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    uploadAttachment,
    deleteAttachment,
    getAttachments,
    deleteAllAttachments,
  };

  return <AttachmentContext.Provider value={value}>{children}</AttachmentContext.Provider>;
}

export function useAttachments() {
  const context = useContext(AttachmentContext);
  if (!context) {
    throw new Error('useAttachments must be used within AttachmentProvider');
  }
  return context;
}