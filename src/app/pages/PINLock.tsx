import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Lock } from 'lucide-react';

export function PINLock() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  
  const savedPin = localStorage.getItem('userPin') || '1234';

  useEffect(() => {
    const type = localStorage.getItem('pinType') as 'pin4' | 'pin6' | 'password' || 'pin4';
    setPinType(type);
  }, []);

  const handlePinChange = (value: string) => {
    setError(''); // Clear error saat input
    
    // Validasi input berdasarkan tipe
    if (pinType === 'pin4') {
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setPin(numericValue);
      
      // Auto submit saat 4 digit terisi
      if (numericValue.length === 4) {
        setTimeout(() => validatePin(numericValue), 100);
      }
    } else if (pinType === 'pin6') {
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

  const validatePin = (inputPin: string) => {
    if (inputPin === savedPin) {
      localStorage.setItem('pinUnlocked', 'true');
      navigate('/');
    } else {
      setError('PIN salah!');
      setPin('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validatePin(pin);
  };

  const getPlaceholder = () => {
    if (pinType === 'pin4') return '••••';
    if (pinType === 'pin6') return '••••••';
    return 'Masukkan password';
  };

  const getTitle = () => {
    if (pinType === 'pin4') return 'Masukkan PIN (4 angka)';
    if (pinType === 'pin6') return 'Masukkan PIN (6 angka)';
    return 'Masukkan Password';
  };

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
            {/* Input PIN/Password - Samsung Secure Folder Style */}
            <div className="space-y-2">
              <Input
                type={pinType === 'password' ? 'password' : 'text'}
                inputMode={pinType === 'password' ? 'text' : 'numeric'}
                placeholder={getPlaceholder()}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className="h-14 text-center text-2xl tracking-widest font-semibold"
                autoFocus
                autoComplete="off"
              />
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm text-center font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Progress indicator untuk PIN */}
              {(pinType === 'pin4' || pinType === 'pin6') && (
                <div className="flex justify-center gap-2 pt-2">
                  {Array.from({ length: pinType === 'pin4' ? 4 : 6 }).map((_, i) => (
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
            {pinType === 'password' && (
              <Button 
                type="submit" 
                className="w-full h-12 text-base"
                disabled={pin.length < 6}
              >
                Buka
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
              onClick={() => {
                localStorage.clear();
                navigate('/login');
              }}
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