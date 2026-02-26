// src/app/hooks/usePendingAttachments.ts
import { useState, useCallback } from 'react';
import { useAttachments } from '../context/AttachmentContext';
import { formatFileSize, isImageFile } from '../../lib/supabase';

export interface PendingFile {
  id: string; // temporary local ID
  file: File;
  previewUrl?: string; // untuk image preview
  name: string;
  size: number;
}

interface UsePendingAttachmentsReturn {
  pendingFiles: PendingFile[];
  addFiles: (files: FileList | File[]) => void;
  removeFile: (tempId: string) => void;
  uploadAllPending: (
    attachableType: 'transaction' | 'task' | 'note',
    attachableId: string
  ) => Promise<{ success: boolean; error: string | null }>;
  isUploading: boolean;
  clearPending: () => void;
}

export function usePendingAttachments(): UsePendingAttachmentsReturn {
  const { uploadAttachment } = useAttachments();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newPending: PendingFile[] = fileArray.map(file => {
      const tempId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      return {
        id: tempId,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
      };
    });
    setPendingFiles(prev => [...prev, ...newPending]);
  }, []);

  const removeFile = useCallback((tempId: string) => {
    setPendingFiles(prev => {
      const file = prev.find(f => f.id === tempId);
      // Revoke object URL untuk free memory
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter(f => f.id !== tempId);
    });
  }, []);

  const uploadAllPending = useCallback(async (
    attachableType: 'transaction' | 'task' | 'note',
    attachableId: string
  ) => {
    if (pendingFiles.length === 0) return { success: true, error: null };

    setIsUploading(true);
    const errors: string[] = [];

    try {
      for (const pending of pendingFiles) {
        const { success, error } = await uploadAttachment(pending.file, attachableType, attachableId);
        if (!success && error) errors.push(`${pending.name}: ${error}`);

        // Revoke object URL setelah upload
        if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
      }

      setPendingFiles([]);

      if (errors.length > 0) {
        return { success: false, error: `Some files failed to upload:\n${errors.join('\n')}` };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Upload failed' };
    } finally {
      setIsUploading(false);
    }
  }, [pendingFiles, uploadAttachment]);

  const clearPending = useCallback(() => {
    pendingFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setPendingFiles([]);
  }, [pendingFiles]);

  return {
    pendingFiles,
    addFiles,
    removeFile,
    uploadAllPending,
    isUploading,
    clearPending,
  };
}