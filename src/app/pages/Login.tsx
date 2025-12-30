import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar, AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { signIn, checkPinSetup } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Sign in dengan Supabase
      await signIn(email, password);

      // 2. Check apakah PIN sudah di-setup
      const hasPinSetup = await checkPinSetup();

      // 3. Redirect berdasarkan PIN status
      if (!hasPinSetup) {
        // Belum setup PIN → ke PIN Setup
        navigate('/pin-setup');
      } else {
        // Sudah setup PIN → ke PIN Lock
        navigate('/pin-lock');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login gagal. Cek email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Calendar className="text-white" size={32} />
            </div>
          </div>
          <CardTitle className="text-3xl">MyDaily</CardTitle>
          <p className="text-gray-500 mt-2">Kelola hidupmu dengan mudah</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="current-password"
              />
            </div>

            {/* Forgot Password Link */}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() => navigate('/forgot-password')}
              disabled={loading}
            >
              Lupa password?
            </Button>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>

            {/* Register Link */}
            <div className="text-center text-sm text-gray-500">
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