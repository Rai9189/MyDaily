import { Check, X } from 'lucide-react';

export function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
      <span className="text-xs text-muted-foreground">Saving...</span>
    </div>
  );
}

interface ConfirmActionProps {
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmAction({
  isLoading,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ConfirmActionProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
      >
        <Check size={14} />
        {confirmText}
      </button>
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
      >
        <X size={14} />
        {cancelText}
      </button>
    </div>
  );
}
