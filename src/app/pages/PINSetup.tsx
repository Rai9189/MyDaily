import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Shield } from 'lucide-react';

export function PINSetup() {
  const navigate = useNavigate();
  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    // Save PIN (in real app, hash it)
    localStorage.setItem('pin', pin);
    localStorage.setItem('pinType', pinType);
    localStorage.setItem('pinSetup', 'true');
    navigate('/');
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
              <Shield className="text-white" size={32} />
            </div>
          </div>
          <CardTitle className="text-3xl">Buat PIN Keamanan</CardTitle>
          <p className="text-gray-500 mt-2">Amankan aplikasi Anda</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="mb-3 block">Tipe PIN</Label>
              <RadioGroup value={pinType} onValueChange={(value: any) => {
                setPinType(value);
                setPin('');
                setConfirmPin('');
              }}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="pin4" id="pin4" />
                  <Label htmlFor="pin4" className="cursor-pointer">
                    PIN 4 Angka
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="pin6" id="pin6" />
                  <Label htmlFor="pin6" className="cursor-pointer">
                    PIN 6 Angka
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="password" id="password" />
                  <Label htmlFor="password" className="cursor-pointer">
                    Password (kombinasi huruf & angka)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="pin">{getPinLabel()}</Label>
              <Input
                id="pin"
                type={pinType === 'password' ? 'password' : 'number'}
                placeholder={getPinPlaceholder()}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={pinType === 'pin4' ? 4 : pinType === 'pin6' ? 6 : undefined}
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPin">Konfirmasi {getPinLabel()}</Label>
              <Input
                id="confirmPin"
                type={pinType === 'password' ? 'password' : 'number'}
                placeholder={getPinPlaceholder()}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                maxLength={pinType === 'pin4' ? 4 : pinType === 'pin6' ? 6 : undefined}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Simpan PIN
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}