// src/app/pages/PINLock.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, AlertCircle, Eye, EyeOff, Clock, Shield } from 'lucide-react';

const AUTO_LOGOUT_MINUTES = 15;
const AUTO_LOGOUT_MS      = AUTO_LOGOUT_MINUTES * 60 * 1000;
const WARNING_BEFORE_MS   = 60 * 1000;

export function PINLock() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading, verifyPin } = useAuth();

  const [pin, setPin]             = useState('');
  const [showPin, setShowPin]     = useState(false);
  const [error, setError]         = useState('');
  const [attempts, setAttempts]   = useState(0);
  const [locked, setLocked]       = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [pinType, setPinType]     = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [loading, setLoading]     = useState(false);

  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown]     = useState(0);
  const idleTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_ATTEMPTS  = 5;
  const LOCK_DURATION = 30;

  const handleAutoLogout = useCallback(async () => {
    clearAllTimers();
    sessionStorage.removeItem('pinUnlocked');
    sessionStorage.removeItem('pinAttempts');
    sessionStorage.removeItem('pinLockUntil');
    await signOut();
    navigate('/login', { replace: true });
  }, [signOut, navigate]);

  const clearAllTimers = () => {
    if (idleTimerRef.current)         clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current)      clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const resetIdleTimer = useCallback(() => {
    clearAllTimers();
    setShowIdleWarning(false);
    setIdleCountdown(0);
    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      setIdleCountdown(Math.round(WARNING_BEFORE_MS / 1000));
      countdownIntervalRef.current = setInterval(() => {
        setIdleCountdown(prev => {
          if (prev <= 1) { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, AUTO_LOGOUT_MS - WARNING_BEFORE_MS);
    idleTimerRef.current = setTimeout(() => { handleAutoLogout(); }, AUTO_LOGOUT_MS);
  }, [handleAutoLogout]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];
    const onActivity = () => resetIdleTimer();
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    resetIdleTimer();
    return () => { events.forEach(e => window.removeEventListener(e, onActivity)); clearAllTimers(); };
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user?.pin_type) {
      if (user.pin_type === 'password') {
        setPinType('password');
      } else {
        try {
          const decoded = atob(user.pin_hash || '');
          setPinType(decoded.length === 6 ? 'pin6' : 'pin4');
        } catch { setPinType('pin4'); }
      }
    }
  }, [user]);

  useEffect(() => {
    const lockUntil = sessionStorage.getItem('pinLockUntil');
    if (lockUntil) {
      const remaining = Math.floor((parseInt(lockUntil) - Date.now()) / 1000);
      if (remaining > 0) { setLocked(true); setLockTimer(remaining); }
      else { sessionStorage.removeItem('pinLockUntil'); sessionStorage.removeItem('pinAttempts'); }
    }
    const savedAttempts = sessionStorage.getItem('pinAttempts');
    if (savedAttempts) setAttempts(parseInt(savedAttempts));
  }, []);

  useEffect(() => {
    if (locked && lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (locked && lockTimer === 0) {
      setLocked(false); setAttempts(0); setError('');
      sessionStorage.removeItem('pinLockUntil');
      sessionStorage.removeItem('pinAttempts');
    }
  }, [locked, lockTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setLoading(true);
    try {
      const { success } = await verifyPin(pin);
      if (success) {
        sessionStorage.removeItem('pinAttempts');
        sessionStorage.removeItem('pinLockUntil');
        clearAllTimers();
        navigate('/');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        sessionStorage.setItem('pinAttempts', newAttempts.toString());
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + LOCK_DURATION * 1000;
          sessionStorage.setItem('pinLockUntil', lockUntil.toString());
          setLocked(true); setLockTimer(LOCK_DURATION);
          setError('');
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          const label = pinType === 'password' ? 'Wrong Password!' : 'Wrong PIN!';
          setError(
            remaining === 1
              ? `${label} Last attempt before lockout.`
              : `${label} ${remaining} attempts remaining before lockout.`
          );
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

  const getMaxLength = () => pinType === 'pin4' ? 4 : pinType === 'pin6' ? 6 : undefined;
  const getPinLabel  = () => pinType === 'pin4' ? '4-Digit PIN' : pinType === 'pin6' ? '6-Digit PIN' : 'Password';
  const isNumericPin = pinType !== 'password';

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card className="border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-card shadow-lg rounded-2xl">
          <CardContent className="pt-8 pb-7 px-7">

            {/* User greeting */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-3">
                <Shield size={22} className="text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'Welcome back'}
              </h1>
              {user?.email && (
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">

              {/* Idle warning */}
              {showIdleWarning && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border-2 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
                  <Clock size={15} className="shrink-0 mt-0.5" />
                  <p>
                    Inactive. Auto-logout in <strong>{idleCountdown}s</strong>.{' '}
                    <button type="button" className="underline font-medium" onClick={resetIdleTimer}>
                      Stay logged in
                    </button>
                  </p>
                </div>
              )}

              {/* Lockout banner */}
              {locked && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border-2 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                  <AlertCircle size={15} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">App Locked</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                      Too many failed attempts. Try again in {lockTimer}s.
                    </p>
                  </div>
                </div>
              )}

              {/* Single merged error + attempt counter banner */}
              {!locked && error && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border-2 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* PIN input */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center font-medium">{getPinLabel()}</p>

                {isNumericPin ? (
                  <div className="relative">
                    <input
                      type="text" inputMode="numeric"
                      value={pin}
                      onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                      maxLength={getMaxLength()}
                      required autoFocus disabled={locked || loading}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-default z-10"
                      onFocus={(e) => e.target.select()}
                    />
                    <div
                      className="flex items-center justify-center gap-4 h-16 w-full rounded-xl border-2 border-input bg-muted/20 cursor-text relative"
                      onClick={() => document.querySelector<HTMLInputElement>('input[inputmode="numeric"]')?.focus()}
                    >
                      {Array.from({ length: getMaxLength() ?? 4 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-center w-6 h-6">
                          {showPin ? (
                            <span className="text-xl font-bold text-foreground leading-none">
                              {pin[i] ?? <span className="text-muted-foreground/30">–</span>}
                            </span>
                          ) : (
                            <div className={`rounded-full transition-all duration-200 ${
                              pin[i] ? 'w-4 h-4 bg-primary shadow-sm' : 'w-3.5 h-3.5 border-2 border-muted-foreground/30 bg-transparent'
                            }`} />
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowPin(!showPin); }}
                        disabled={locked || loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-20">
                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
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
                      required autoFocus disabled={locked || loading}
                      className="flex h-12 w-full rounded-xl border-2 border-input bg-muted/20 px-3 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    />
                    <button type="button" onClick={() => setShowPin(!showPin)} disabled={locked || loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Unlock button */}
              <Button type="submit" className="w-full gap-2" disabled={locked || loading}>
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                  : locked ? `Locked (${lockTimer}s)` : 'Unlock'
                }
              </Button>

              {/* Footer links */}
              <div className="pt-2 border-t border-border space-y-1">
                <Button type="button" variant="link"
                  onClick={() => navigate('/pin-setup', { state: { forgotPin: true } })}
                  className="text-sm text-muted-foreground p-0 h-auto w-full justify-start"
                  disabled={loading}>
                  Forgot my PIN
                </Button>
                <Button type="button" variant="link"
                  onClick={handleSwitchAccount}
                  className="text-sm text-muted-foreground p-0 h-auto w-full justify-start"
                  disabled={loading}>
                  Sign in with another account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}