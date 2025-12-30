import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { validatePinFormat } from '../../utils/pinEncryption';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Lock, AlertCircle } from 'lucide-react';

export function PINSetup() {
  const navigate = useNavigate();
  const { setupPin, user } = useAuth();
  
  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePinChange = (value: string) => {
    setError('');
    
    // Validasi input berdasarkan tipe
    if (pinType === 'pin4') {
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setPin(numericValue);
    } else if (pinType === 'pin6') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setPin(numericValue);
    } else {
      setPin(value);
    }
  };

  const handleConfirmPinChange = (value: string) => {
    setError('');
    
    if (pinType === 'pin4') {
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setConfirmPin(numericValue);
    } else if (pinType === 'pin6') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setConfirmPin(numericValue);
    } else {
      setConfirmPin(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('User tidak terautentikasi');
      return;
    }

    // Validasi format PIN
    if (!validatePinFormat(pin, pinType)) {
      if (pinType === 'pin4') {
        setError('PIN harus 4 digit angka!');
      } else if (pinType === 'pin6') {
        setError('PIN harus 6 digit angka!');
      } else {
        setError('Password minimal 6 karakter!');
      }
      return;
    }
    
    if (pin !== confirmPin) {
      setError('PIN/Password tidak cocok!');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // Save PIN ke Supabase
      await setupPin(pin, pinType);
      
      // Redirect ke PIN Lock
      navigate('/pin-lock');
    } catch (err: any) {
      console.error('PIN setup error:', err);
      setError(err.message || 'Gagal menyimpan PIN');
    } finally {
      setLoading(false);
    }
  };

  // Reset input saat ganti tipe
  const handleTypeChange = (newType: 'pin4' | 'pin6' | 'password') => {
    setPinType(newType);
    setPin('');
    setConfirmPin('');
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
          <p className="text-gray-500 mt-2">Amankan aplikasi Anda</p>
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

            {/* Pilihan Tipe PIN */}
            <div>
              <Label className="mb-3 block font-semibold">Tipe PIN</Label>
              <RadioGroup 
                value={pinType} 
                onValueChange={(value: any) => handleTypeChange(value)}
                disabled={loading}
              >
                <div className="flex items-center space-x-2 mb-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
                  <RadioGroupItem value="pin4" id="pin4" />
                  <Label htmlFor="pin4" className="cursor-pointer flex-1 font-normal">
                    PIN 4 angka
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 mb-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
                  <RadioGroupItem value="pin6" id="pin6" />
                  <Label htmlFor="pin6" className="cursor-pointer flex-1 font-normal">
                    PIN 6 angka
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
                  <RadioGroupItem value="password" id="password" />
                  <Label htmlFor="password" className="cursor-pointer flex-1 font-normal">
                    Password
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Input PIN */}
            <div>
              <Label htmlFor="pin">
                {pinType === 'pin4' && 'PIN (4 Angka)'}
                {pinType === 'pin6' && 'PIN (6 Angka)'}
                {pinType === 'password' && 'Password (min. 6 karakter)'}
              </Label>
              <Input
                id="pin"
                type={pinType === 'password' ? 'password' : 'text'}
                inputMode={pinType === 'password' ? 'text' : 'numeric'}
                placeholder={
                  pinType === 'pin4' ? '••••' : 
                  pinType === 'pin6' ? '••••••' : 
                  'Masukkan password'
                }
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className="text-center text-lg tracking-widest"
                autoComplete="off"
                disabled={loading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {pinType === 'pin4' && `${pin.length}/4 digit`}
                {pinType === 'pin6' && `${pin.length}/6 digit`}
                {pinType === 'password' && `${pin.length} karakter (min. 6)`}
              </p>
            </div>

            {/* Konfirmasi PIN */}
            <div>
              <Label htmlFor="confirmPin">
                Konfirmasi {pinType === 'password' ? 'Password' : 'PIN'}
              </Label>
              <Input
                id="confirmPin"
                type={pinType === 'password' ? 'password' : 'text'}
                inputMode={pinType === 'password' ? 'text' : 'numeric'}
                placeholder={
                  pinType === 'pin4' ? '••••' : 
                  pinType === 'pin6' ? '••••••' : 
                  'Ulangi password'
                }
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                className="text-center text-lg tracking-widest"
                autoComplete="off"
                disabled={loading}
                required
              />
            </div>

            {/* Tombol Submit */}
            <Button 
              type="submit" 
              className="w-full h-12 text-base"
              disabled={
                loading ||
                (pinType === 'pin4' && (pin.length !== 4 || confirmPin.length !== 4)) ||
                (pinType === 'pin6' && (pin.length !== 6 || confirmPin.length !== 6)) ||
                (pinType === 'password' && (pin.length < 6 || confirmPin.length < 6))
              }
            >
              {loading ? 'Menyimpan...' : 'Simpan PIN'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}