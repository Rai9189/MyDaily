import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock } from 'lucide-react';

export function PINLock() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const savedPin = localStorage.getItem('pin') || '1234';

  useEffect(() => {
    const type = localStorage.getItem('pinType') as 'pin4' | 'pin6' | 'password' || 'pin4';
    setPinType(type);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin === savedPin) {
      localStorage.setItem('pinUnlocked', 'true');
      navigate('/');
    } else {
      setError('PIN/Password salah!');
      setPin('');
    }
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
          <p className="text-gray-500 mt-2">Masukkan {getPinLabel()} Anda</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500">PIN/Password</Label>
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
                className="text-center text-xl"
              />
            </div>
            
            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <Button type="submit" className="w-full">
              Buka
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  localStorage.clear();
                  navigate('/login');
                }}
                className="text-sm"
              >
                Keluar Akun
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}