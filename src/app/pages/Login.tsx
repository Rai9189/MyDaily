// src/app/pages/Login.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';

const MAX_ATTEMPTS     = 3;
const COOLDOWN_SECONDS = 30;
const STORAGE_KEY_ATTEMPTS   = 'login_attempts';
const STORAGE_KEY_LOCK_UNTIL = 'login_lock_until';

function getRemainingCooldown(): number {
  const lockUntil = parseInt(sessionStorage.getItem(STORAGE_KEY_LOCK_UNTIL) || '0');
  const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

function getAttempts(): number {
  return parseInt(sessionStorage.getItem(STORAGE_KEY_ATTEMPTS) || '0');
}

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [attempts, setAttempts]       = useState<number>(getAttempts);
  const [cooldown, setCooldown]       = useState<number>(getRemainingCooldown);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      const remaining = getRemainingCooldown();
      setCooldown(remaining);
      if (remaining <= 0) { clearInterval(interval); setError(null); }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const isLocked = cooldown > 0;

  const recordFailedAttempt = useCallback(() => {
    const newAttempts = getAttempts() + 1;
    sessionStorage.setItem(STORAGE_KEY_ATTEMPTS, String(newAttempts));
    setAttempts(newAttempts);
    if (newAttempts >= MAX_ATTEMPTS) {
      const lockUntil = Date.now() + COOLDOWN_SECONDS * 1000;
      sessionStorage.setItem(STORAGE_KEY_LOCK_UNTIL, String(lockUntil));
      setCooldown(COOLDOWN_SECONDS);
    }
    return newAttempts;
  }, []);

  const resetAttempts = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY_ATTEMPTS);
    sessionStorage.removeItem(STORAGE_KEY_LOCK_UNTIL);
    setAttempts(0);
    setCooldown(0);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setLoading(true);
    setError(null);
    const { success, error: signInError } = await signIn(email, password);
    setLoading(false);
    if (success) {
      resetAttempts();
    } else {
      const newAttempts = recordFailedAttempt();
      const remaining   = MAX_ATTEMPTS - newAttempts;
      if (newAttempts >= MAX_ATTEMPTS) {
        setError(`Too many failed attempts. Please wait ${COOLDOWN_SECONDS} seconds.`);
      } else {
        setError(
          `${signInError || 'Login failed. Please check your email and password.'}` +
          (remaining > 0 ? ` (${remaining} attempt${remaining > 1 ? 's' : ''} remaining)` : '')
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card className="border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-card shadow-lg rounded-2xl">
          <CardContent className="pt-8 pb-7 px-7">
            {/* Logo inside card */}
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="MyDaily" className="w-40 h-auto object-contain dark:invert" />
            </div>

            <div className="mb-5">
              <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">

              {/* Lockout / error banner */}
              {error && (
                <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border-2 text-sm ${
                  isLocked
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                }`}>
                  {isLocked && <ShieldAlert size={15} className="shrink-0 mt-0.5" />}
                  <p>{isLocked ? `Account temporarily locked. Try again in ${cooldown}s.` : error}</p>
                </div>
              )}

              {/* Attempts warning */}
              {attempts >= 2 && !isLocked && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                    ⚠️ {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts > 1 ? 's' : ''} remaining before temporary lockout
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email" type="email" placeholder="name@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required disabled={loading || isLocked}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required disabled={loading || isLocked}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || isLocked}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button" variant="link" className="p-0 h-auto text-sm"
                  onClick={() => navigate('/forgot-password')} disabled={loading}
                >
                  Forgot password?
                </Button>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading || isLocked}>
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                  : isLocked ? `Locked (${cooldown}s)` : 'Sign In'
                }
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Button
                  type="button" variant="link" className="p-0 h-auto font-medium"
                  onClick={() => navigate('/register')} disabled={loading}
                >
                  Register now
                </Button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}