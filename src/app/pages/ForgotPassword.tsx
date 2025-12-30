import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar, ArrowLeft, Mail, AlertCircle } from 'lucide-react';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email harus diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Gagal mengirim email reset password.');
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle className="text-3xl">Lupa Password</CardTitle>
          <p className="text-gray-500 mt-2">
            {sent ? 'Email terkirim!' : 'Reset password Anda'}
          </p>
        </CardHeader>

        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <p className="text-sm text-gray-500 mt-2">
                  Kami akan mengirim link reset password ke email Anda
                </p>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
              </Button>

              {/* Back to Login */}
              <div className="text-center text-sm text-gray-500">
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
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="text-green-600" size={32} />
                </div>
              </div>
              <p className="text-gray-600">
                Link reset password telah dikirim ke <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Silakan cek inbox atau folder spam Anda
              </p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Kembali ke Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}