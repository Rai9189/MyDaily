import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { success, error: signInError } = await signIn(email, password);
    setLoading(false);

    if (success) {
      // ✅ FIX Bug 2: Bersihkan PIN lama saat login akun baru
      // Cek apakah email yang login sama dengan yang tersimpan sebelumnya
      const lastEmail = localStorage.getItem('lastLoginEmail');
      if (lastEmail && lastEmail !== email) {
        // Akun berbeda — hapus PIN lama agar tidak terpakai
        localStorage.removeItem('pin');
        localStorage.removeItem('pinSetup');
        localStorage.removeItem('pinType');
        localStorage.removeItem('pinAttempts');
        localStorage.removeItem('pinLockUntil');
        sessionStorage.removeItem('pinUnlocked');
      }
      // Simpan email yang sedang login
      localStorage.setItem('lastLoginEmail', email);

      const pinSetup = localStorage.getItem('pinSetup');
      if (pinSetup) {
        navigate('/pin-lock');
      } else {
        navigate('/pin-setup');
      }
    } else {
      setError(signInError || 'Login gagal. Periksa email dan password Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6 pb-6">
          <div className="flex justify-center mb-5">
            <img
              src="/logo.png"
              alt="MyDaily"
              className="w-full max-w-xs h-auto object-contain dark:invert"
            />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="email" className="dark:text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="dark:text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-start">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => navigate('/forgot-password')}
                disabled={loading}
              >
                Lupa password?
              </Button>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </Button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Belum punya akun?{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/register')}
                disabled={loading}
              >
                Daftar sekarang
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}