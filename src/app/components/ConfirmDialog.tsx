// src/app/components/ConfirmDialog.tsx
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'danger',
  loading      = false,
  onConfirm,
  onCancel,
  icon,
}: ConfirmDialogProps) {
  const confirmClass =
    variant === 'danger'  ? 'bg-red-600 hover:bg-red-700 text-white' :
    variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
    '';

  const iconBgClass =
    variant === 'danger'  ? 'bg-red-100 dark:bg-red-900/30' :
    variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
    'bg-muted';

  const iconColorClass =
    variant === 'danger'  ? 'text-red-600 dark:text-red-400' :
    variant === 'warning' ? 'text-amber-600 dark:text-amber-400' :
    'text-foreground';

  return (
    // While an action is in flight, swallow every dismiss path (Escape, overlay
    // click, the built-in close button) — not just the Cancel button — so a
    // pending delete can't be interrupted halfway through.
    <Dialog open={open} onOpenChange={(next) => { if (!next && !loading) onCancel(); }}>
      <DialogContent className="max-w-[420px] p-0 gap-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center text-center px-5 pt-6 pb-3 gap-3">
          {icon && (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
              <span className={iconColorClass}>{icon}</span>
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-4 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-sm h-9"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={`flex-1 gap-1.5 text-sm h-9 ${confirmClass}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
