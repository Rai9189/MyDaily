import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Lock } from 'lucide-react';

export function PINSetup() {
  const navigate = useNavigate();
  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handlePinChange = (value: string) => {
    // Validasi input berdasarkan tipe
    if (pinType === 'pin4') {
      // Hanya angka, maksimal 4 digit
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setPin(numericValue);
    } else if (pinType === 'pin6') {
      // Hanya angka, maksimal 6 digit
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setPin(numericValue);
    } else {
      // Password: bebas, minimal 6 karakter
      setPin(value);
    }
  };

  const handleConfirmPinChange = (value: string) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi berdasarkan tipe
    if (pinType === 'pin4' && pin.length !== 4) {
      alert('PIN harus 4 digit!');
      return;
    }
    
    if (pinType === 'pin6' && pin.length !== 6) {
      alert('PIN harus 6 digit!');
      return;
    }
    
    if (pinType === 'password' && pin.length < 6) {
      alert('Password minimal 6 karakter!');
      return;
    }
    
    if (pin !== confirmPin) {
      alert('PIN/Password tidak cocok!');
      return;
    }
    
    // Simpan ke localStorage
    localStorage.setItem('userPin', pin);
    localStorage.setItem('pinType', pinType);
    localStorage.setItem('pinSetup', 'true');
    
    // Navigasi ke PIN Lock
    navigate('/pin-lock');
  };

  // Reset input saat ganti tipe
  const handleTypeChange = (newType: 'pin4' | 'pin6' | 'password') => {
    setPinType(newType);
    setPin('');
    setConfirmPin('');
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
            {/* Pilihan Tipe PIN - Samsung Style */}
            <div>
              <Label className="mb-3 block font-semibold">Tipe PIN</Label>
              <RadioGroup 
                value={pinType} 
                onValueChange={(value: any) => handleTypeChange(value)}
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
                required
              />
            </div>

            {/* Tombol Submit */}
            <Button 
              type="submit" 
              className="w-full h-12 text-base"
              disabled={
                (pinType === 'pin4' && (pin.length !== 4 || confirmPin.length !== 4)) ||
                (pinType === 'pin6' && (pin.length !== 6 || confirmPin.length !== 6)) ||
                (pinType === 'password' && (pin.length < 6 || confirmPin.length < 6))
              }
            >
              Simpan PIN
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}