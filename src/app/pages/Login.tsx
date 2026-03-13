import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';

const MAX_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 30;
const STORAGE_KEY_ATTEMPTS = 'login_attempts';
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rate limiting state
  const [attempts, setAttempts] = useState<number>(getAttempts);
  const [cooldown, setCooldown] = useState<number>(getRemainingCooldown);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      const remaining = getRemainingCooldown();
      setCooldown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setError(null);
      }
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
      // Routing ditangani oleh PublicRoute di App.tsx
    } else {
      const newAttempts = recordFailedAttempt();
      const remaining = MAX_ATTEMPTS - newAttempts;

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6 pb-6">
          <div className="flex justify-center mb-5">
            <img
              src="/logo.png"
              alt="MyDaily"
              className="w-full max-w-xs h-auto object-contain dark:invert"
            />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Error / Lockout message */}
            {error && (
              <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                isLocked
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                {isLocked && <ShieldAlert className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />}
                <p className={`text-sm ${
                  isLocked
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {isLocked
                    ? `Account temporarily locked. Try again in ${cooldown}s.`
                    : error}
                </p>
              </div>
            )}

            {/* Attempts warning (show when >= 3 attempts but not yet locked) */}
            {attempts >= 3 && !isLocked && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-700 dark:text-yellow-400 text-center">
                  ⚠️ {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts > 1 ? 's' : ''} left before temporary lockout
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="email" className="dark:text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || isLocked}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="dark:text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || isLocked}
                  className="pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || isLocked}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-start">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => navigate('/forgot-password')}
                disabled={loading}
              >
                Forgot password?
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || isLocked}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : isLocked ? (
                `Locked (${cooldown}s)`
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/register')}
                disabled={loading}
              >
                Register now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}