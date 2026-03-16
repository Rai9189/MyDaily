// src/app/pages/Settings.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTrash } from '../context/TrashContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Lock, Tag, Trash2, Sun, Moon, Monitor, Mail,
  ShieldCheck, Loader2, AlertCircle, CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* ── Notification ── */
function Notification({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm ${
      type === 'success'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
    }`}>
      {type === 'success'
        ? <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
        : <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
      }
      {message}
    </div>
  );
}

/* ── Row item inside a card ── */
function SettingRow({
  icon,
  label,
  description,
  onClick,
  disabled,
  badge,
  children,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className="text-primary flex-shrink-0">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground block">{label}</span>
        </span>
        {badge && <span className="flex-shrink-0">{badge}</span>}
        {onClick && !disabled && <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" />}
      </button>
      {description && (
        <p className="text-xs text-muted-foreground px-1">{description}</p>
      )}
      {children}
    </div>
  );
}

/* ── Section wrapper ── */
function SettingSection({
  icon,
  title,
  borderColor = 'border-blue-200 dark:border-blue-900/50',
  children,
}: {
  icon: React.ReactNode;
  title: string;
  borderColor?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`bg-white dark:bg-card border-2 ${borderColor} shadow-sm rounded-xl`}>
      <CardContent className="pt-4 pb-4 px-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-primary">{icon}</span>
          {title}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────── Component ── */
export function Settings() {
  const navigate = useNavigate();
  const { user, verifyPin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { trashItems } = useTrash();

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  /* ── Change Password ── */
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleChangePassword = async () => {
    if (!user?.email) return;
    if (!confirm(`Send password reset link to ${user.email}?`)) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      showNotif('success', `Reset link sent to ${user.email}. Check your inbox!`);
    } catch {
      showNotif('error', 'Failed to send reset email. Please try again.');
    } finally {
      setSendingReset(false);
    }
  };

  /* ── Change PIN ── */
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinVerifyError, setPinVerifyError] = useState<string | null>(null);
  const [pinVerifyAttempts, setPinVerifyAttempts] = useState(0);
  const PIN_VERIFY_MAX = 3;

  const handleVerifyOldPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinVerifyAttempts >= PIN_VERIFY_MAX) return;
    setVerifyingPin(true);
    setPinVerifyError(null);
    const { success } = await verifyPin(oldPin);
    setVerifyingPin(false);
    if (success) {
      setShowPinVerify(false);
      setOldPin('');
      setPinVerifyAttempts(0);
      navigate('/pin-setup', { state: { forgotPin: true } });
    } else {
      const newAttempts = pinVerifyAttempts + 1;
      setPinVerifyAttempts(newAttempts);
      const remaining = PIN_VERIFY_MAX - newAttempts;
      setPinVerifyError(remaining <= 0
        ? 'Too many failed attempts. PIN change is locked.'
        : `Wrong PIN. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
      );
      setOldPin('');
    }
  };

  const pinLocked = pinVerifyAttempts >= PIN_VERIFY_MAX;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* ── Header ── */}
          <p className="text-sm font-medium text-foreground/65">Security, Preferences & Data</p>

          {/* ── Notification ── */}
          {notification && <Notification type={notification.type} message={notification.message} />}

          {/* ══ Security ══ */}
          <SettingSection icon={<Lock size={15} />} title="Security">

            {/* Change Password */}
            <SettingRow
              icon={<Mail size={15} />}
              label={
                resetSent
                  ? <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle2 size={13} /> Reset Link Sent
                    </span>
                  : sendingReset ? 'Sending...' : 'Change Password'
              }
              description={`A secure reset link will be sent to ${user?.email}. Expires in 1 hour.`}
              onClick={!resetSent ? handleChangePassword : undefined}
              disabled={sendingReset}
            >
              {resetSent && (
                <button
                  type="button"
                  onClick={() => { setResetSent(false); handleChangePassword(); }}
                  disabled={sendingReset}
                  className="text-xs text-primary hover:underline px-1"
                >
                  Resend email
                </button>
              )}
            </SettingRow>

            {/* Change PIN */}
            <SettingRow
              icon={<ShieldCheck size={15} />}
              label={pinLocked ? 'PIN Change Locked' : 'Change Security PIN'}
              description="Change your app unlock PIN or password used on the lock screen."
              onClick={() => {
                if (pinLocked) return;
                setShowPinVerify(v => !v);
                setOldPin('');
                setPinVerifyError(null);
              }}
              disabled={pinLocked}
            >
              {showPinVerify && !pinLocked && (
                <form
                  onSubmit={handleVerifyOldPin}
                  className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border mt-1"
                >
                  <p className="text-xs text-muted-foreground">Enter your current PIN to continue</p>
                  {pinVerifyError && <Notification type="error" message={pinVerifyError} />}
                  <div className="space-y-1.5">
                    <Label htmlFor="oldPin" className="text-sm">Current PIN</Label>
                    <Input
                      id="oldPin"
                      type="password"
                      placeholder="Enter current PIN"
                      value={oldPin}
                      onChange={(e) => setOldPin(e.target.value)}
                      required
                      disabled={verifyingPin}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 gap-2" disabled={verifyingPin || !oldPin}>
                      {verifyingPin
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                        : 'Verify & Continue'
                      }
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowPinVerify(false); setOldPin(''); setPinVerifyError(null); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </SettingRow>
          </SettingSection>

          {/* ══ Data ══ */}
          <SettingSection icon={<Tag size={15} />} title="Data" borderColor="border-amber-200 dark:border-amber-900/50">
            <SettingRow
              icon={<Tag size={15} />}
              label="Manage Categories"
              description="Customize categories for transactions, tasks, and notes."
              onClick={() => navigate('/categories')}
            />
            <SettingRow
              icon={<Trash2 size={15} />}
              label="View Trash"
              description="Items in trash are permanently deleted after 30 days."
              onClick={() => navigate('/trash')}
              badge={
                trashItems.length > 0
                  ? <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      {trashItems.length}
                    </span>
                  : undefined
              }
            />
          </SettingSection>

          {/* ══ Theme ══ */}
          <SettingSection icon={<Sun size={15} />} title="Theme" borderColor="border-purple-200 dark:border-purple-900/50">
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => {
                const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
                const label = t.charAt(0).toUpperCase() + t.slice(1);
                const active = theme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground px-1">
              Choose light, dark, or follow your system preference.
            </p>
          </SettingSection>

          {/* ══ App Version ══ */}
          <div className="flex items-center justify-between px-1 pt-1 pb-2">
            <p className="text-xs text-muted-foreground/60">MyDaily</p>
            <p className="text-xs text-muted-foreground/60">Version 1.0.0</p>
          </div>

        </div>
      </div>
    </div>
  );
}