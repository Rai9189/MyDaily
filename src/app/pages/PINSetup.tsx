// src/app/pages/PINSetup.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Shield, Loader2 } from 'lucide-react';

export function PINSetup() {
  const navigate = useNavigate();
  const { user, loading: authLoading, updateProfile } = useAuth();

  const [pinType, setPinType] = useState<'pin4' | 'pin6' | 'password'>('pin4');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jika PIN sudah pernah dibuat, langsung redirect ke pin-lock.
  // User tidak perlu membuat PIN baru setelah logout.
  useEffect(() => {
    const pinAlreadySetup = localStorage.getItem('pinSetup');
    if (pinAlreadySetup) {
      navigate('/pin-lock', { replace: true });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (pinType === 'pin4' && pin.length !== 4) {
      setError('PIN harus 4 digit!');
      return;
    }

    if (pinType === 'pin6' && pin.length !== 6) {
      setError('PIN harus 6 digit!');
      return;
    }

    if (pinType === 'password' && pin.length < 6) {
      setError('Password minimal 6 karakter!');
      return;
    }

    if (pin !== confirmPin) {
      setError('PIN/Password tidak cocok!');
      return;
    }

    setSubmitting(true);

    try {
      // Simple hash function (untuk keamanan dasar)
      const hashPin = btoa(pin); // Base64 encoding

      // Simpan PIN ke localStorage terlebih dahulu
      // Ini harus selalu berhasil terlepas dari kondisi user/network
      localStorage.setItem('pin', hashPin);
      localStorage.setItem('pinType', pinType);
      localStorage.setItem('pinSetup', 'true');
      localStorage.setItem('pinUnlocked', 'true');

      // Update profil user di database jika user sudah ter-load
      // Jika gagal (misal user null atau network error), tidak masalah —
      // PIN sudah tersimpan di localStorage dan user tetap bisa masuk
      if (user) {
        try {
          await updateProfile({
            pin_type: pinType === 'password' ? 'password' : 'numeric',
          });
        } catch (profileErr) {
          // Gagal update profil tidak menghalangi user masuk
          console.warn('updateProfile gagal, tapi PIN tetap tersimpan:', profileErr);
        }
      }

      // Navigasi ke dashboard
      navigate('/');
    } catch (err) {
      setError('Gagal menyimpan PIN. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
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
              <Shield className="text-white" size={32} />
            </div>
          </div>
          <CardTitle className="text-3xl dark:text-white">Buat PIN Keamanan</CardTitle>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Amankan aplikasi Anda dengan PIN tambahan
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <Label className="mb-3 block dark:text-gray-300">Tipe PIN</Label>
              <RadioGroup value={pinType} onValueChange={(value: any) => {
                setPinType(value);
                setPin('');
                setConfirmPin('');
              }}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="pin4" id="pin4" />
                  <Label htmlFor="pin4" className="cursor-pointer dark:text-gray-300">
                    PIN 4 Angka (Cepat & Mudah)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="pin6" id="pin6" />
                  <Label htmlFor="pin6" className="cursor-pointer dark:text-gray-300">
                    PIN 6 Angka (Lebih Aman)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="password" id="password" />
                  <Label htmlFor="password" className="cursor-pointer dark:text-gray-300">
                    Password (Paling Aman)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="pin" className="dark:text-gray-300">{getPinLabel()}</Label>
              <Input
                id="pin"
                type={pinType === 'password' ? 'password' : 'number'}
                placeholder={getPinPlaceholder()}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={pinType === 'pin4' ? 4 : pinType === 'pin6' ? 6 : undefined}
                required
                disabled={submitting}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="confirmPin" className="dark:text-gray-300">Konfirmasi {getPinLabel()}</Label>
              <Input
                id="confirmPin"
                type={pinType === 'password' ? 'password' : 'number'}
                placeholder={getPinPlaceholder()}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                maxLength={pinType === 'pin4' ? 4 : pinType === 'pin6' ? 6 : undefined}
                required
                disabled={submitting}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                <strong>Catatan:</strong> PIN ini hanya untuk keamanan tambahan di perangkat Anda.
                Anda tetap bisa login dengan email & password Supabase.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan PIN'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}