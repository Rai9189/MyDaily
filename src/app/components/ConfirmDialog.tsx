// src/app/components/ConfirmDialog.tsx
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Loader2, X } from 'lucide-react';

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
  // ✅ visible = apakah DOM masih dirender (untuk animasi keluar)
  const [visible, setVisible] = useState(open);
  // ✅ show = apakah opacity 100 (untuk animasi masuk/keluar)
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      // Delay sedikit agar browser sempat render sebelum trigger transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });
    } else {
      setShow(false);
      // Tunggu animasi fade-out selesai (200ms) baru unmount
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!visible) return null;

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
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        show ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
      }`}
    >
      <div
        className={`relative w-full max-w-[420px] bg-white dark:bg-card rounded-2xl shadow-2xl border border-border overflow-hidden transition-all duration-200 ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
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
      </div>
    </div>
  );
}