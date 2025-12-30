import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi
    if (!name || !email || !password || !confirmPassword) {
      setError('Semua field harus diisi');
      return;
    }

    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password tidak cocok!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Register dengan Supabase
      await signUp(email, password, name);

      // Show success message
      setSuccess(true);

      // Wait 2 seconds then redirect
      setTimeout(() => {
        navigate('/pin-setup');
      }, 2000);
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err.message || 'Registrasi gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Success State
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="text-green-600" size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-semibold">Registrasi Berhasil!</h2>
              <p className="text-gray-600">
                Akun Anda telah dibuat. Silakan setup PIN keamanan...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-4"
            onClick={() => navigate('/login')}
            disabled={loading}
          >
            <ArrowLeft size={20} />
          </Button>
          
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Calendar className="text-white" size={32} />
            </div>
          </div>
          <CardTitle className="text-3xl">Daftar Akun</CardTitle>
          <p className="text-gray-500 mt-2">Buat akun MyDaily baru</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Name Input */}
            <div>
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
                autoComplete="name"
              />
            </div>

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
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimal 8 karakter
              </p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Daftar'}
            </Button>

            {/* Login Link */}
            <div className="text-center text-sm text-gray-500">
              Sudah punya akun?{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Masuk
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}