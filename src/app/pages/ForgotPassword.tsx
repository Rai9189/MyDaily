import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Mail } from 'lucide-react';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy - in real app, send reset email
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-0"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft size={20} />
          </Button>
          
          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <CardTitle className="text-3xl">Lupa Password</CardTitle>
          <p className="text-gray-500 mt-2">
            {sent ? 'Email terkirim!' : 'Reset password Anda'}
          </p>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  Kami akan mengirim link reset password ke email Anda
                </p>
              </div>

              <Button type="submit" className="w-full">
                Kirim Link Reset
              </Button>

              <div className="text-center text-sm text-gray-500">
                Ingat password?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate('/login')}
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