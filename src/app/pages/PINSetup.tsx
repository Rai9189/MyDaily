// src/app/pages/PINSetup.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export function PINSetup() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, loading: authLoading, hasPin, savePin } = useAuth();

  const [pinType, setPinType]             = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [pin, setPin]                     = useState('');
  const [confirmPin, setConfirmPin]       = useState('');
  const [showPin, setShowPin]             = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const isForgotPin = location.state?.forgotPin === true;

  useEffect(() => {
    if (!authLoading && user && hasPin() && !isForgotPin) {
      navigate('/pin-lock', { replace: true });
    }
  }, [authLoading, user]);

  const handlePinTypeChange = (value: 'pin4' | 'pin6' | 'password') => {
    setPinType(value);
    setPin(''); setConfirmPin('');
    setShowPin(false); setShowConfirmPin(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pinType === 'pin4'     && pin.length !== 4) { setError('PIN must be exactly 4 digits.'); return; }
    if (pinType === 'pin6'     && pin.length !== 6) { setError('PIN must be exactly 6 digits.'); return; }
    if (pinType === 'password' && pin.length < 6)   { setError('Password must be at least 6 characters.'); return; }
    if (pin !== confirmPin) { setError('PIN/Password does not match.'); return; }

    setSubmitting(true);
    try {
      const { success, error: saveError } = await savePin(pin, pinType);
      if (!success) { setError(saveError || 'Failed to save PIN. Please try again.'); return; }
      navigate('/');
    } catch {
      setError('Failed to save PIN. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPinLabel       = () => pinType === 'pin4' ? '4-Digit PIN' : pinType === 'pin6' ? '6-Digit PIN' : 'Password';
  const isNumeric         = pinType !== 'password';

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card className="border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-card shadow-lg rounded-2xl">
          <CardContent className="pt-8 pb-7 px-7">

            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="MyDaily" className="w-40 h-auto object-contain dark:invert" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {isForgotPin ? 'Reset your PIN' : 'Set up PIN lock'}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isForgotPin ? 'Create a new PIN for your account' : 'Protect your app with a PIN or password'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border-2 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  <p>{error}</p>
                </div>
              )}

              {/* PIN Type */}
              <div className="space-y-1.5">
                <Label>Security Type</Label>
                <Select value={pinType} onValueChange={handlePinTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pin4">4-Digit PIN — Quick & Easy</SelectItem>
                    <SelectItem value="pin6">6-Digit PIN — More Secure</SelectItem>
                    <SelectItem value="password">Password — Most Secure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PIN Input */}
              <div className="space-y-1.5">
                <Label htmlFor="pin">{getPinLabel()}</Label>
                {isNumeric ? (
                  <div className="relative">
                    <input
                      id="pin"
                      type="text"
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setPin(val);
                      }}
                      maxLength={pinType === 'pin4' ? 4 : 6}
                      required disabled={submitting}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-default z-10"
                    />
                    <div
                      className="flex items-center justify-center gap-4 h-16 w-full rounded-xl border-2 border-input bg-muted/20 cursor-text relative"
                      onClick={() => document.getElementById('pin')?.focus()}
                    >
                      {Array.from({ length: pinType === 'pin4' ? 4 : 6 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-center w-6 h-6">
                          {showPin ? (
                            <span className="text-xl font-bold text-foreground leading-none">
                              {pin[i] ?? <span className="text-muted-foreground/30">–</span>}
                            </span>
                          ) : (
                            <div className={`rounded-full transition-all duration-200 ${
                              pin[i]
                                ? 'w-4 h-4 bg-primary shadow-sm'
                                : 'w-3.5 h-3.5 border-2 border-muted-foreground/30 bg-transparent'
                            }`} />
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowPin(!showPin); }}
                        disabled={submitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-20">
                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="pin"
                      type={showPin ? 'text' : 'password'}
                      placeholder="Enter password (min. 6 chars)"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      required disabled={submitting} className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPin(!showPin)} disabled={submitting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Confirm PIN */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPin">Confirm {getPinLabel()}</Label>
                {isNumeric ? (
                  <div className="relative">
                    <input
                      id="confirmPin"
                      type="text"
                      inputMode="numeric"
                      value={confirmPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setConfirmPin(val);
                      }}
                      maxLength={pinType === 'pin4' ? 4 : 6}
                      required disabled={submitting}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-default z-10"
                    />
                    <div
                      className={`flex items-center justify-center gap-4 h-16 w-full rounded-xl border-2 bg-muted/20 cursor-text relative transition-colors ${
                        confirmPin.length > 0
                          ? pin === confirmPin ? 'border-green-400 dark:border-green-600' : 'border-red-400 dark:border-red-600'
                          : 'border-input'
                      }`}
                      onClick={() => document.getElementById('confirmPin')?.focus()}
                    >
                      {Array.from({ length: pinType === 'pin4' ? 4 : 6 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-center w-6 h-6">
                          {showConfirmPin ? (
                            <span className="text-xl font-bold text-foreground leading-none">
                              {confirmPin[i] ?? <span className="text-muted-foreground/30">–</span>}
                            </span>
                          ) : (
                            <div className={`rounded-full transition-all duration-200 ${
                              confirmPin[i]
                                ? `w-4 h-4 shadow-sm ${pin === confirmPin.slice(0, i + 1) + (confirmPin[i] || '') ? 'bg-primary' : 'bg-primary'}`
                                : 'w-3.5 h-3.5 border-2 border-muted-foreground/30 bg-transparent'
                            }`} />
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowConfirmPin(!showConfirmPin); }}
                        disabled={submitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-20">
                        {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPin.length > 0 && (
                      <p className={`text-xs mt-1 ${pin === confirmPin ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {pin === confirmPin ? '✓ Matches' : '✗ Does not match'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative">
                      <Input
                        id="confirmPin"
                        type={showConfirmPin ? 'text' : 'password'}
                        placeholder="Repeat password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        required disabled={submitting}
                        className={`pr-10 ${
                          confirmPin.length > 0
                            ? pin === confirmPin ? 'border-green-400 dark:border-green-600' : 'border-red-400 dark:border-red-600'
                            : ''
                        }`}
                      />
                      <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} disabled={submitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPin.length > 0 && (
                      <p className={`text-xs ${pin === confirmPin ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {pin === confirmPin ? '✓ Matches' : '✗ Does not match'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                  : 'Save PIN'
                }
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}