import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, Loader2, AlertCircle } from 'lucide-react';

export function PINLock() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [loading, setLoading] = useState(false);
  
  const savedPin = localStorage.getItem('pin');
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 30; // seconds

  useEffect(() => {
    const type = localStorage.getItem('pinType') as 'pin4' | 'pin6' | 'password' || 'pin4';
    setPinType(type);

    // Check if there's an active lock
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

    // Load previous attempts
    const savedAttempts = localStorage.getItem('pinAttempts');
    if (savedAttempts) {
      setAttempts(parseInt(savedAttempts));
    }
  }, []);

  // Lock timer countdown
  useEffect(() => {
    if (locked && lockTimer > 0) {
      const timer = setTimeout(() => {
        setLockTimer(lockTimer - 1);
      }, 1000);
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
    
    if (locked) {
      setError(`Terlalu banyak percobaan. Coba lagi dalam ${lockTimer} detik.`);
      return;
    }

    setLoading(true);
    
    // Simulate processing delay for security
    setTimeout(() => {
      const hashedInput = btoa(pin); // Base64 encoding
      
      if (hashedInput === savedPin) {
        // Correct PIN
        localStorage.setItem('pinUnlocked', 'true');
        localStorage.removeItem('pinAttempts');
        localStorage.removeItem('pinLockUntil');
        navigate('/');
      } else {
        // Wrong PIN
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem('pinAttempts', newAttempts.toString());
        
        if (newAttempts >= MAX_ATTEMPTS) {
          // Lock the app
          const lockUntil = Date.now() + (LOCK_DURATION * 1000);
          localStorage.setItem('pinLockUntil', lockUntil.toString());
          setLocked(true);
          setLockTimer(LOCK_DURATION);
          setError(`Terlalu banyak percobaan gagal! Tunggu ${LOCK_DURATION} detik.`);
        } else {
          setError(`PIN/Password salah! (${newAttempts}/${MAX_ATTEMPTS} percobaan)`);
        }
        setPin('');
      }
      
      setLoading(false);
    }, 500);
  };

  const handleLogout = async () => {
    if (!confirm('Keluar dari akun akan menghapus PIN lock. Lanjutkan?')) return;
    
    // Clear PIN data
    localStorage.removeItem('pinUnlocked');
    localStorage.removeItem('pinSetup');
    localStorage.removeItem('pin');
    localStorage.removeItem('pinType');
    localStorage.removeItem('pinAttempts');
    localStorage.removeItem('pinLockUntil');
    
    // Sign out from Supabase
    await signOut();
    navigate('/login');
  };

  const getPinLabel = () => {
    switch (pinType) {
      case 'pin4': return 'PIN 4 Angka';
      case 'pin6': return 'PIN 6 Angka';
      case 'password': return 'Password';
    }
  };

  const getPinPlaceholder = () => {
    switch (pinType) {
      case 'pin4': return '1234';
      case 'pin6': return '123456';
      case 'password': return 'Masukkan password';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Lock className="text-white" size={32} />
            </div>
          </div>
          <CardTitle className="text-3xl dark:text-white">MyDaily</CardTitle>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {user?.name ? `Halo, ${user.name}` : 'Masukkan PIN Anda'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {locked && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                      Aplikasi Terkunci
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      Terlalu banyak percobaan gagal. Tunggu {lockTimer} detik untuk mencoba lagi.
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
                  Peringatan: {MAX_ATTEMPTS - attempts} percobaan tersisa sebelum aplikasi terkunci.
                </p>
              </div>
            )}

            <div>
              <Label className="text-sm text-gray-500 dark:text-gray-400">
                {getPinLabel()}
              </Label>
              <Input
                type={pinType === 'password' ? 'password' : 'number'}
                placeholder={getPinPlaceholder()}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                maxLength={pinType === 'pin4' ? 4 : pinType === 'pin6' ? 6 : undefined}
                required
                autoFocus
                disabled={locked || loading}
                className="text-center text-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={locked || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : locked ? (
                `Terkunci (${lockTimer}s)`
              ) : (
                'Buka'
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={handleLogout}
                className="text-sm"
                disabled={loading}
              >
                Keluar Akun
              </Button>
            </div>

            {user?.email && (
              <div className="text-center pt-4 border-t dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Login sebagai: {user.email}
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}