import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTrash } from '../context/TrashContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

import { Lock, Tag, Trash2, Sun, Moon, Monitor, Mail, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

function Notification({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`p-3 rounded-lg border flex items-start gap-2 ${
      type === 'success'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
        : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      }
      <p className={`text-sm ${
        type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'
      }`}>{message}</p>
    </div>
  );
}

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
      showNotif('success', `Password reset link sent to ${user.email}. Check your inbox!`);
    } catch {
      showNotif('error', 'Failed to send reset email. Please try again.');
    } finally {
      setSendingReset(false);
    }
  };

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
        ? 'Too many failed attempts. Access to PIN change is locked.'
        : `Wrong PIN. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
      );
      setOldPin('');
    }
  };

  return (
    <div className="space-y-5 p-1">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Security, preferences & data</p>
      </div>

      {notification && <Notification type={notification.type} message={notification.message} />}

      {/* Security */}
      <Card className="border border-border bg-card">
        <div className="px-5 pt-4 pb-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Lock size={18} /> Security
          </h3>
        </div>
        <CardContent className="space-y-4 pt-0 pb-3">

          {/* Change Password */}
          <div>
            <Button variant="outline" className="w-full justify-start gap-2" type="button" onClick={handleChangePassword} disabled={sendingReset || resetSent}>
              {sendingReset ? <><Loader2 size={15} className="animate-spin" /> Sending...</>
                : resetSent ? <><Mail size={15} /> Reset Link Sent — Check Your Email</>
                : <><Mail size={15} /> Change Password</>}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5 px-1">
              A secure reset link will be sent to <span className="font-medium">{user?.email}</span>. Expires in 1 hour.
            </p>
            {resetSent && (
              <Button variant="link" className="text-xs p-0 h-auto mt-1" onClick={() => { setResetSent(false); handleChangePassword(); }} disabled={sendingReset}>
                Resend email
              </Button>
            )}
          </div>

          {/* Change PIN */}
          <div>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { setShowPinVerify(!showPinVerify); setOldPin(''); setPinVerifyError(null); setPinVerifyAttempts(0); }} type="button" disabled={pinVerifyAttempts >= PIN_VERIFY_MAX}>
              <ShieldCheck size={15} />
              {pinVerifyAttempts >= PIN_VERIFY_MAX ? 'PIN Change Locked' : 'Change Security PIN'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5 px-1">
              Change your app unlock PIN or password used on the lock screen.
            </p>

            {showPinVerify && pinVerifyAttempts < PIN_VERIFY_MAX && (
              <form onSubmit={handleVerifyOldPin} className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border mt-2">
                <p className="text-xs text-muted-foreground">Enter your current PIN to continue</p>
                {pinVerifyError && <Notification type="error" message={pinVerifyError} />}
                <div className="space-y-1.5">
                  <Label htmlFor="oldPin" className="text-sm">Current PIN</Label>
                  <Input id="oldPin" type="password" placeholder="Enter current PIN" value={oldPin} onChange={(e) => setOldPin(e.target.value)} required disabled={verifyingPin} autoFocus />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={verifyingPin || !oldPin}>
                    {verifyingPin ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...</> : 'Verify & Continue'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowPinVerify(false); setOldPin(''); setPinVerifyError(null); }}>Cancel</Button>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card className="border border-border bg-card">
        <div className="px-5 pt-4 pb-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Tag size={18} /> Data
          </h3>
        </div>
        <CardContent className="space-y-4 pt-0 pb-3">
          <div>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/categories')} type="button">
              <Tag size={15} /> Manage Categories
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5 px-1">Customize categories for transactions, tasks, and notes</p>
          </div>

          <div>
            <Button variant="outline" className="w-full justify-start gap-2 relative" onClick={() => navigate('/trash')} type="button">
              <Trash2 size={15} /> View Trash
              {trashItems.length > 0 && (
                <span className="ml-auto text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{trashItems.length}</span>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5 px-1">Items in trash are permanently deleted after 30 days</p>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="border border-border bg-card">
        <div className="px-5 pt-4 pb-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Sun size={18} /> Theme
          </h3>
        </div>
        <CardContent className="pt-2 pb-4">
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
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-sm font-medium transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">Choose between light, dark, or follow your system preference</p>
        </CardContent>
      </Card>
    </div>
  );
}