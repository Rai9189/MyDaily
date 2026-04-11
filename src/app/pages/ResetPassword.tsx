// src/app/pages/ResetPassword.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle2, KeyRound, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [done, setDone]                       = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [sessionReady, setSessionReady]       = useState(false);
  const [invalidLink, setInvalidLink]         = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    const timeout = setTimeout(() => {
      setInvalidLink(true);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Setelah selesai, sign out dulu agar PublicRoute tidak redirect ke dashboard
  const handleGoToLogin = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('pinUnlocked');
    sessionStorage.removeItem('pinAttempts');
    sessionStorage.removeItem('pinLockUntil');
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      toast.success('Password updated successfully!');
      setDone(true);

      // Auto redirect ke login setelah 2 detik
      setTimeout(() => { handleGoToLogin(); }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state — tunggu Supabase proses token dari URL hash
  if (!sessionReady && !invalidLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Link tidak valid / expired
  if (invalidLink && !sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Card className="border-2 border-red-200 dark:border-red-900/50 bg-white dark:bg-card shadow-lg rounded-2xl">
            <CardContent className="pt-8 pb-7 px-7 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle size={28} className="text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Link Invalid or Expired</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  This reset link has expired or already been used. Please request a new one.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate('/forgot-password')}>
                Request New Link
              </Button>
              <Button variant="link" className="text-sm text-muted-foreground w-full"
                onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card className="border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-card shadow-lg rounded-2xl">
          <CardContent className="pt-8 pb-7 px-7">

            {!done ? (
              <>
                <div className="flex flex-col items-center mb-6">
                  <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                    <KeyRound size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground text-center">Set New Password</h1>
                  <p className="text-sm text-muted-foreground mt-1 text-center">
                    Choose a strong password for your account
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border-2 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        required disabled={loading} className="pr-10"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        required disabled={loading}
                        className={`pr-10 ${
                          confirmPassword.length > 0
                            ? password === confirmPassword
                              ? 'border-green-400 dark:border-green-600'
                              : 'border-red-400 dark:border-red-600'
                            : ''
                        }`}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && (
                      <p className={`text-xs ${password === confirmPassword ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {password === confirmPassword ? '✓ Matches' : '✗ Does not match'}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" /> Updating...</>
                      : 'Update Password'
                    }
                  </Button>
                </form>
              </>
            ) : (
              /* Success state — auto redirect dalam 2 detik */
              <div className="text-center space-y-4 py-2">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Password Updated!</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Redirecting you to login...
                  </p>
                </div>
                <Button className="w-full" onClick={handleGoToLogin}>
                  Go to Login Now
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}