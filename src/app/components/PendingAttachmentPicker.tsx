// src/app/components/PendingAttachmentPicker.tsx
import { useRef } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { FileText, Image as ImageIcon, X, Loader2, Paperclip } from 'lucide-react';
import { formatFileSize, isImageFile } from '../../lib/supabase';
import { PendingFile } from '../hooks/usePendingAttachments';

interface PendingAttachmentPickerProps {
  pendingFiles: PendingFile[];
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (tempId: string) => void;
  isUploading?: boolean;
  disabled?: boolean;
}

export function PendingAttachmentPicker({
  pendingFiles,
  onAddFiles,
  onRemoveFile,
  isUploading = false,
  disabled = false,
}: PendingAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>
          Attachments{' '}
          <span className="text-muted-foreground font-normal">(Optional, max 10MB each)</span>
        </Label>

        <div
          className={`flex items-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <Paperclip size={16} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">
            {pendingFiles.length === 0
              ? 'Click to attach files (JPEG, PNG, PDF)'
              : `${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''} selected — click to add more`
            }
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onAddFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {/* Preview list */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map(pending => (
            <div
              key={pending.id}
              className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-lg border border-border"
            >
              {/* Preview thumbnail atau icon */}
              {pending.previewUrl ? (
                <img
                  src={pending.previewUrl}
                  alt={pending.name}
                  className="w-9 h-9 rounded object-cover flex-shrink-0"
                />
              ) : isImageFile(pending.name) ? (
                <ImageIcon size={18} className="text-primary flex-shrink-0" />
              ) : (
                <FileText size={18} className="text-red-500 flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{pending.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(pending.size)}</p>
              </div>

              {isUploading ? (
                <Loader2 size={15} className="animate-spin text-primary flex-shrink-0" />
              ) : (
                <button
                  type="button"
                  onClick={() => onRemoveFile(pending.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  disabled={disabled}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading attachments...
        </div>
      )}
    </div>
  );
}