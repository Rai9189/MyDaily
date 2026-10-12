// src/app/components/PinPromptDialog.tsx
// Asks for the app PIN/password before revealing something sensitive (e.g. a locked note).
// Uses verifyPin, so the same 5-attempt limit and 30-second lockout apply.
import { useEffect, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface PinPromptDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PinPromptDialog({
  open,
  title = 'Enter PIN',
  description = 'This note is locked. Enter your PIN to open it.',
  onSuccess,
  onCancel,
}: PinPromptDialogProps) {
  const { user, verifyPin } = useAuth();
  const isPassword = user?.pin_type === 'password';
  const pinLength  = user?.pin_length === 6 ? 6 : 4;

  const [pin, setPin]                 = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow]                 = useState(Date.now());

  useEffect(() => {
    if (open) { setPin(''); setError(''); }
  }, [open]);

  // Lockout countdown
  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  useEffect(() => {
    if (!secondsLeft) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || secondsLeft) return;
    setLoading(true);
    const result = await verifyPin(pin);
    setLoading(false);
    setPin('');
    if (result.success) { onSuccess(); return; }
    if (result.locked && result.lockedUntil) {
      setLockedUntil(new Date(result.lockedUntil).getTime());
      setNow(Date.now());
      setError('Too many failed attempts.');
    } else {
      setError(result.error || 'Wrong PIN.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock size={16} /> {title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            inputMode={isPassword ? undefined : 'numeric'}
            autoComplete="off"
            autoFocus
            placeholder={isPassword ? 'Password' : `${pinLength}-digit PIN`}
            maxLength={isPassword ? undefined : pinLength}
            value={pin}
            onChange={e => { setPin(isPassword ? e.target.value : e.target.value.replace(/\D/g, '')); setError(''); }}
            disabled={loading || !!secondsLeft}
            className="text-center tracking-widest"
          />
          {error && <p className="text-xs text-center text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={loading || !pin || !!secondsLeft}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {secondsLeft ? `Locked (${secondsLeft}s)` : 'Unlock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
