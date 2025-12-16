import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, Lock } from 'lucide-react';

export function PINSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'setup' | 'confirm'>('setup');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const currentPin = step === 'setup' ? pin : confirmPin;

  const handleNumberPad = (num: string) => {
    if (currentPin.length < 4) {
      const newPin = currentPin + num;
      
      if (step === 'setup') {
        setPin(newPin);
        if (newPin.length === 4) {
          // Move to confirm step
          setTimeout(() => {
            setStep('confirm');
            setError('');
          }, 200);
        }
      } else {
        setConfirmPin(newPin);
        if (newPin.length === 4) {
          // Validate
          setTimeout(() => {
            if (newPin === pin) {
              // Save PIN
              localStorage.setItem('pin', pin);
              localStorage.setItem('pinType', 'numeric');
              localStorage.setItem('pinSetup', 'true');
              navigate('/');
            } else {
              setError('PIN tidak cocok! Ulangi lagi.');
              setTimeout(() => {
                setPin('');
                setConfirmPin('');
                setStep('setup');
                setError('');
              }, 1500);
            }
          }, 100);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'setup') {
      setPin(currentPin.slice(0, -1));
    } else {
      setConfirmPin(currentPin.slice(0, -1));
    }
    setError('');
  };

  const handleReset = () => {
    setPin('');
    setConfirmPin('');
    setStep('setup');
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
          <CardTitle className="text-3xl">Buat PIN Keamanan</CardTitle>
          <p className="text-gray-500 mt-2">
            {step === 'setup' ? 'Masukkan PIN 4 angka' : 'Konfirmasi PIN Anda'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* PIN Dots */}
            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    currentPin.length > i
                      ? 'bg-blue-600 border-blue-600 scale-110'
                      : 'border-gray-300'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="text-center">
                <p className="text-red-600 text-sm animate-pulse">{error}</p>
              </div>
            )}

            {!error && step === 'confirm' && (
              <div className="text-center">
                <p className="text-green-600 text-sm">✓ PIN diatur</p>
              </div>
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
                  className="h-16 text-xl hover:bg-blue-50 hover:border-blue-300 transition-all"
                  disabled={currentPin.length >= 4}
                >
                  {num}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleReset}
                className="h-16 text-sm"
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleNumberPad('0')}
                className="h-16 text-xl hover:bg-blue-50 hover:border-blue-300 transition-all"
                disabled={currentPin.length >= 4}
              >
                0
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBackspace}
                className="h-16"
                disabled={currentPin.length === 0}
              >
                ⌫
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500 mt-4">
              <p>PIN ini akan digunakan untuk mengamankan aplikasi Anda</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
