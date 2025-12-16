import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Calendar, Lock } from 'lucide-react';

export function PINLock() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [pinType, setPinType] = useState<'numeric' | 'password'>('numeric');
  const savedPin = localStorage.getItem('pin') || '1234';

  useEffect(() => {
    const type = localStorage.getItem('pinType') as 'numeric' | 'password' || 'numeric';
    setPinType(type);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin === savedPin) {
      localStorage.setItem('pinUnlocked', 'true');
      navigate('/');
    } else {
      setError('PIN salah!');
      setPin('');
    }
  };

  const handleNumberPad = (num: string) => {
    if (pinType === 'numeric' && pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto submit when 4 digits entered
        setTimeout(() => {
          if (newPin === savedPin) {
            localStorage.setItem('pinUnlocked', 'true');
            navigate('/');
          } else {
            setError('PIN salah!');
            setPin('');
          }
        }, 100);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
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
          <p className="text-gray-500 mt-2">
            Masukkan {pinType === 'numeric' ? 'PIN' : 'password'} Anda
          </p>
        </CardHeader>
        <CardContent>
          {pinType === 'numeric' ? (
            <div className="space-y-6">
              {/* PIN Dots */}
              <div className="flex justify-center gap-4 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      pin.length > i
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <p className="text-red-600 text-center text-sm">{error}</p>
              )}

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => handleNumberPad(num.toString())}
                    className="h-16 text-xl"
                  >
                    {num}
                  </Button>
                ))}
                <div />
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleNumberPad('0')}
                  className="h-16 text-xl"
                >
                  0
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleBackspace}
                  className="h-16"
                >
                  ⌫
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Masukkan password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                required
                autoFocus
              />
              
              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <Button type="submit" className="w-full">
                Buka
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
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
        </CardContent>
      </Card>
    </div>
  );
}
