import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function PINLock() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [loading, setLoading] = useState(false);

  const savedPin = localStorage.getItem('pin');
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 30;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const type = localStorage.getItem('pinType') as 'pin4' | 'pin6' | 'password' || 'pin4';
    setPinType(type);

    const lockUntil = localStorage.getItem('pinLockUntil');
    if (lockUntil) {
      const remaining = Math.floor((parseInt(lockUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setLocked(true);
        setLockTimer(remaining);
      } else {
        localStorage.removeItem('pinLockUntil');
        localStorage.removeItem('pinAttempts');
      }
    }

    const savedAttempts = localStorage.getItem('pinAttempts');
    if (savedAttempts) setAttempts(parseInt(savedAttempts));
  }, []);

  useEffect(() => {
    if (locked && lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (locked && lockTimer === 0) {
      setLocked(false);
      setAttempts(0);
      localStorage.removeItem('pinLockUntil');
      localStorage.removeItem('pinAttempts');
    }
  }, [locked, lockTimer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) { setError(`Too many attempts. Try again in ${lockTimer} seconds.`); return; }
    setLoading(true);
    setTimeout(() => {
      const hashedInput = btoa(pin);
      if (hashedInput === savedPin) {
        sessionStorage.setItem('pinUnlocked', 'true');
        localStorage.removeItem('pinAttempts');
        localStorage.removeItem('pinLockUntil');
        navigate('/');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem('pinAttempts', newAttempts.toString());
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + LOCK_DURATION * 1000;
          localStorage.setItem('pinLockUntil', lockUntil.toString());
          setLocked(true);
          setLockTimer(LOCK_DURATION);
          setError(`Too many failed attempts! Wait ${LOCK_DURATION} seconds.`);
        } else {
          setError(`Wrong PIN/Password! (${newAttempts}/${MAX_ATTEMPTS} attempts)`);
        }
        setPin('');
      }
      setLoading(false);
    }, 500);
  };

  const handleSwitchAccount = async () => {
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

          {/* ✅ Logo — center */}
          <div className="flex justify-center mb-3">
            <img
              src="/logo.png"
              alt="MyDaily"
              className="w-48 h-auto object-contain dark:invert"
            />
          </div>

          {/* ✅ Hello — center */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-5">
            {user?.name ? `Hello, ${user.name}` : 'Enter your PIN'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
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

              {/* ✅ PIN Input: numerik pakai dot display custom, password pakai input biasa */}
              {isNumericPin ? (
                <div className="relative">
                  {/* Input tersembunyi untuk menangkap input */}
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
                  {/* ✅ Visual display: kotak-kotak dot yang benar-benar center */}
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
                    {/* Eye toggle */}
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={() => setShowPin(!showPin)}
                      disabled={locked || loading}
                    >
                      {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              ) : (
                /* Password mode: input teks biasa */
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowPin(!showPin)}
                    disabled={locked || loading}
                  >
                    {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              )}
            </div>

            {/* ✅ Unlock — center */}
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