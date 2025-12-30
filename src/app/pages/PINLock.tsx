import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Lock, AlertCircle } from 'lucide-react';

export function PINLock() {
  const navigate = useNavigate();
  const { profile, unlockWithPin, signOut, loading: authLoading } = useAuth();
  
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinChange = (value: string) => {
    setError('');
    
    if (!profile) return;

    // Validasi input berdasarkan tipe PIN
    if (profile.pin_type === 'pin4') {
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setPin(numericValue);
      
      // Auto submit saat 4 digit terisi
      if (numericValue.length === 4) {
        setTimeout(() => validatePin(numericValue), 100);
      }
    } else if (profile.pin_type === 'pin6') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setPin(numericValue);
      
      // Auto submit saat 6 digit terisi
      if (numericValue.length === 6) {
        setTimeout(() => validatePin(numericValue), 100);
      }
    } else {
      // Password: bebas input
      setPin(value);
    }
  };

  const validatePin = async (inputPin: string) => {
    setLoading(true);
    setError('');

    try {
      await unlockWithPin(inputPin);
      // Jika berhasil, navigate ke dashboard
      navigate('/');
    } catch (err: any) {
      console.error('PIN verification error:', err);
      setError(err.message || 'PIN salah!');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validatePin(pin);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getPlaceholder = () => {
    if (!profile) return '••••';
    if (profile.pin_type === 'pin4') return '••••';
    if (profile.pin_type === 'pin6') return '••••••';
    return 'Masukkan password';
  };

  const getTitle = () => {
    if (!profile) return 'Masukkan PIN';
    if (profile.pin_type === 'pin4') return 'Masukkan PIN (4 angka)';
    if (profile.pin_type === 'pin6') return 'Masukkan PIN (6 angka)';
    return 'Masukkan Password';
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // No profile (should not happen, but safety check)
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Profile tidak ditemukan</p>
            <Button onClick={() => navigate('/login')}>Kembali ke Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Lock className="text-white" size={32} />
            </div>
          </div>
          <CardTitle className="text-3xl">MyDaily</CardTitle>
          <p className="text-gray-500 mt-2">{getTitle()}</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Input PIN/Password */}
            <div className="space-y-2">
              <Input
                type={profile.pin_type === 'password' ? 'password' : 'text'}
                inputMode={profile.pin_type === 'password' ? 'text' : 'numeric'}
                placeholder={getPlaceholder()}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className="h-14 text-center text-2xl tracking-widest font-semibold"
                autoFocus
                autoComplete="off"
                disabled={loading}
              />
              
              {/* Progress indicator untuk PIN */}
              {(profile.pin_type === 'pin4' || profile.pin_type === 'pin6') && (
                <div className="flex justify-center gap-2 pt-2">
                  {Array.from({ 
                    length: profile.pin_type === 'pin4' ? 4 : 6 
                  }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all ${
                        pin.length > i
                          ? 'bg-blue-600 scale-110'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Tombol Buka - Hanya muncul untuk Password */}
            {profile.pin_type === 'password' && (
              <Button 
                type="submit" 
                className="w-full h-12 text-base"
                disabled={loading || pin.length < 6}
              >
                {loading ? 'Memverifikasi...' : 'Buka'}
              </Button>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
            </div>

            {/* Tombol Keluar Akun */}
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              disabled={loading}
              className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              Keluar Akun
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}