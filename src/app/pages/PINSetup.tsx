// src/app/pages/PINSetup.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export function PINSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, hasPin, savePin } = useAuth();

  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isForgotPin = location.state?.forgotPin === true;

  useEffect(() => {
    if (!authLoading && user && hasPin() && !isForgotPin) {
      navigate('/pin-lock', { replace: true });
    }
  }, [authLoading, user]);

  const handlePinTypeChange = (value: 'pin4' | 'pin6' | 'password') => {
    setPinType(value);
    setPin('');
    setConfirmPin('');
    setShowPin(false);
    setShowConfirmPin(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pinType === 'pin4' && pin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pinType === 'pin6' && pin.length !== 6) {
      setError('PIN must be exactly 6 digits.');
      return;
    }
    if (pinType === 'password' && pin.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN/Password does not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { success, error: saveError } = await savePin(pin, pinType);
      if (!success) {
        setError(saveError || 'Failed to save PIN. Please try again.');
        return;
      }
      navigate('/');
    } catch {
      setError('Failed to save PIN. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPinLabel = () => {
    switch (pinType) {
      case 'pin4': return '4-Digit PIN';
      case 'pin6': return '6-Digit PIN';
      case 'password': return 'Password';
    }
  };

  const getPinPlaceholder = () => {
    switch (pinType) {
      case 'pin4': return '••••';
      case 'pin6': return '••••••';
      case 'password': return 'Enter password';
    }
  };

  const isNumeric = pinType !== 'password';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-8 pb-8">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="MyDaily"
              className="w-full max-w-xs h-auto object-contain dark:invert"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* PIN Type Dropdown */}
            <div className="space-y-1.5">
              <Label className="dark:text-gray-300">PIN Type</Label>
              <Select value={pinType} onValueChange={handlePinTypeChange}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pin4">4-Digit PIN (Quick & Easy)</SelectItem>
                  <SelectItem value="pin6">6-Digit PIN (More Secure)</SelectItem>
                  <SelectItem value="password">Password (Most Secure)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PIN Input */}
            <div className="space-y-1.5">
              <Label htmlFor="pin" className="dark:text-gray-300">{getPinLabel()}</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode={isNumeric ? 'numeric' : 'text'}
                  placeholder={getPinPlaceholder()}
                  value={pin}
                  onChange={(e) => {
                    const val = isNumeric
                      ? e.target.value.replace(/\D/g, '')
                      : e.target.value;
                    setPin(val);
                  }}
                  maxLength={pinType === 'pin4' ? 4 : pinType === 'pin6' ? 6 : undefined}
                  required
                  disabled={submitting}
                  className="pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  disabled={submitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm PIN Input */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPin" className="dark:text-gray-300">
                Confirm {getPinLabel()}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPin"
                  type={showConfirmPin ? 'text' : 'password'}
                  inputMode={isNumeric ? 'numeric' : 'text'}
                  placeholder={getPinPlaceholder()}
                  value={confirmPin}
                  onChange={(e) => {
                    const val = isNumeric
                      ? e.target.value.replace(/\D/g, '')
                      : e.target.value;
                    setConfirmPin(val);
                  }}
                  maxLength={pinType === 'pin4' ? 4 : pinType === 'pin6' ? 6 : undefined}
                  required
                  disabled={submitting}
                  className="pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  disabled={submitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save PIN'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}