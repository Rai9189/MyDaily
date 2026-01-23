import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { success, error: resetError } = await resetPassword(email);

    if (success) {
      setSent(true);
    } else {
      setError(resetError || 'Gagal mengirim email reset password');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-0"
            onClick={() => navigate('/login')}
            disabled={loading}
          >
            <ArrowLeft size={20} />
          </Button>
          
          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <CardTitle className="text-3xl dark:text-white">Lupa Password</CardTitle>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {sent ? 'Email terkirim!' : 'Reset password Anda'}
          </p>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div>
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
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Kami akan mengirim link reset password ke email Anda
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  'Kirim Link Reset'
                )}
              </Button>

              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                Ingat password?{' '}
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
          ) : (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <Mail className="text-green-600 dark:text-green-400" size={32} />
                </div>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300">
                  Link reset password telah dikirim ke
                </p>
                <p className="font-semibold dark:text-white mt-1">{email}</p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Silakan cek inbox atau folder spam Anda. Link akan kadaluarsa dalam 1 jam.
              </p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Kembali ke Login
              </Button>
              <Button
                type="button"
                variant="link"
                className="text-sm"
                onClick={() => setSent(false)}
              >
                Kirim ulang email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}