// src/app/pages/PINLock.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Loader2, AlertCircle, Eye, EyeOff, Clock } from 'lucide-react';

// ============================================
// AUTO-LOGOUT CONFIG
// Jika tab tidak aktif / idle selama X menit → signOut otomatis
// ============================================
const AUTO_LOGOUT_MINUTES = 15;
const AUTO_LOGOUT_MS = AUTO_LOGOUT_MINUTES * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000; // tampilkan warning 1 menit sebelum logout

export function PINLock() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading, verifyPin } = useAuth();

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [loading, setLoading] = useState(false);

  // Auto-logout state
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 30;

  // ============================================
  // AUTO-LOGOUT: Reset idle timer setiap ada aktivitas
  // ============================================
  const handleAutoLogout = useCallback(async () => {
    clearAllTimers();
    sessionStorage.removeItem('pinUnlocked');
    sessionStorage.removeItem('pinAttempts');
    sessionStorage.removeItem('pinLockUntil');
    await signOut();
    navigate('/login', { replace: true });
  }, [signOut, navigate]);

  const clearAllTimers = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const resetIdleTimer = useCallback(() => {
    clearAllTimers();
    setShowIdleWarning(false);
    setIdleCountdown(0);

    // Set warning timer (tampil 1 menit sebelum logout)
    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      setIdleCountdown(Math.round(WARNING_BEFORE_MS / 1000));

      // Countdown setiap detik
      countdownIntervalRef.current = setInterval(() => {
        setIdleCountdown(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, AUTO_LOGOUT_MS - WARNING_BEFORE_MS);

    // Set actual logout timer
    idleTimerRef.current = setTimeout(() => {
      handleAutoLogout();
    }, AUTO_LOGOUT_MS);
  }, [handleAutoLogout]);

  // Pasang event listener untuk deteksi aktivitas user
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];
    const onActivity = () => resetIdleTimer();

    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    resetIdleTimer(); // mulai timer saat komponen mount

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      clearAllTimers();
    };
  }, [resetIdleTimer]);

  // ============================================
  // EXISTING LOGIC (tidak berubah)
  // ============================================
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user?.pin_type) {
      if (user.pin_type === 'password') {
        setPinType('password');
      } else {
        try {
          const decoded = atob(user.pin_hash || '');
          setPinType(decoded.length === 6 ? 'pin6' : 'pin4');
        } catch {
          setPinType('pin4');
        }
      }
    }
  }, [user]);

  useEffect(() => {
    const lockUntil = sessionStorage.getItem('pinLockUntil');
    if (lockUntil) {
      const remaining = Math.floor((parseInt(lockUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setLocked(true);
        setLockTimer(remaining);
      } else {
        sessionStorage.removeItem('pinLockUntil');
        sessionStorage.removeItem('pinAttempts');
      }
    }
    const savedAttempts = sessionStorage.getItem('pinAttempts');
    if (savedAttempts) setAttempts(parseInt(savedAttempts));
  }, []);

  useEffect(() => {
    if (locked && lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (locked && lockTimer === 0) {
      setLocked(false);
      setAttempts(0);
      sessionStorage.removeItem('pinLockUntil');
      sessionStorage.removeItem('pinAttempts');
    }
  }, [locked, lockTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) {
      setError(`Too many attempts. Try again in ${lockTimer} seconds.`);
      return;
    }

    setLoading(true);
    try {
      const { success } = await verifyPin(pin);
      if (success) {
        sessionStorage.removeItem('pinAttempts');
        sessionStorage.removeItem('pinLockUntil');
        clearAllTimers(); // stop idle timer setelah berhasil unlock
        navigate('/');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        sessionStorage.setItem('pinAttempts', newAttempts.toString());

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + LOCK_DURATION * 1000;
          sessionStorage.setItem('pinLockUntil', lockUntil.toString());
          setLocked(true);
          setLockTimer(LOCK_DURATION);
          setError(`Too many failed attempts! Wait ${LOCK_DURATION} seconds.`);
        } else {
          setError(`Wrong PIN/Password! (${newAttempts}/${MAX_ATTEMPTS} attempts)`);
        }
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    clearAllTimers();
    sessionStorage.removeItem('pinUnlocked');
    await signOut();
    navigate('/login');
  };

  const handleForgotPin = () => {
    navigate('/pin-setup', { state: { forgotPin: true } });
  };

  const getMaxLength = () => pinType === 'pin4' ? 4 : pinType === 'pin6' ? 6 : undefined;
  const getPinLabel = () => {
    switch (pinType) {
      case 'pin4': return '4-Digit PIN';
      case 'pin6': return '6-Digit PIN';
      case 'password': return 'Password';
    }
  };
  const isNumericPin = pinType !== 'password';

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6 pb-6">
          <div className="flex justify-center mb-3">
            <img src="/logo.png" alt="MyDaily" className="w-48 h-auto object-contain dark:invert" />
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-5">
            {user?.name ? `Hello, ${user.name}` : 'Enter your PIN'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Idle warning */}
            {showIdleWarning && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg flex items-start gap-2">
                <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Inactive for too long. Auto-logout in <strong>{idleCountdown}s</strong>.{' '}
                  <button
                    type="button"
                    className="underline font-medium"
                    onClick={resetIdleTimer}
                  >
                    Stay logged in
                  </button>
                </p>
              </div>
            )}

            {/* Lockout */}
            {locked && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-300">App Locked</p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      Too many failed attempts. Wait {lockTimer} seconds to try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!locked && error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {!locked && attempts > 0 && attempts < MAX_ATTEMPTS && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Warning: {MAX_ATTEMPTS - attempts} attempt(s) remaining before the app is locked.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-sm text-gray-500 dark:text-gray-400 block">
                {getPinLabel()}
              </Label>

              {isNumericPin ? (
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPin(val);
                      setError('');
                    }}
                    maxLength={getMaxLength()}
                    required
                    autoFocus
                    disabled={locked || loading}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-default"
                    onFocus={(e) => e.target.select()}
                  />
                  <div
                    className="flex items-center justify-center gap-3 h-12 w-full rounded-md border border-input bg-input-background dark:bg-gray-700 dark:border-gray-600 cursor-text relative"
                    onClick={() => document.querySelector<HTMLInputElement>('input[inputmode="numeric"]')?.focus()}
                  >
                    {Array.from({ length: getMaxLength() ?? 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-center w-7 h-7">
                        {showPin ? (
                          <span className="text-xl font-bold text-foreground dark:text-white">
                            {pin[i] ?? <span className="text-muted-foreground">–</span>}
                          </span>
                        ) : (
                          <div className={`rounded-full transition-all duration-150 ${
                            pin[i]
                              ? 'w-4 h-4 bg-foreground dark:bg-white'
                              : 'w-3 h-3 bg-muted-foreground/30 dark:bg-gray-500'
                          }`} />
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPin(!showPin)}
                      disabled={locked || loading}
                    >
                      {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setError(''); }}
                    required
                    autoFocus
                    disabled={locked || loading}
                    className="flex h-12 w-full rounded-md border border-input bg-input-background px-3 pr-10 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPin(!showPin)}
                    disabled={locked || loading}
                  >
                    {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={locked || loading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : locked ? (
                `Locked (${lockTimer}s)`
              ) : (
                'Unlock'
              )}
            </button>

            <div className="pt-2 border-t dark:border-gray-700 space-y-1">
              <Button
                type="button"
                variant="link"
                onClick={handleForgotPin}
                className="text-sm text-muted-foreground p-0 h-auto flex justify-start w-full"
                disabled={loading}
              >
                Forgot my PIN
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={handleSwitchAccount}
                className="text-sm text-muted-foreground p-0 h-auto flex justify-start w-full"
                disabled={loading}
              >
                Sign in with another account
              </Button>
            </div>

            {user?.email && (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Signed in as: {user.email}
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}