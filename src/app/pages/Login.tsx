import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy login - in real app, validate credentials
    localStorage.setItem('isLoggedIn', 'true');
    navigate('/pin-setup');
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
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() => navigate('/forgot-password')}
            >
              Lupa password?
            </Button>

            <Button type="submit" className="w-full">
              Masuk
            </Button>

            <div className="text-center text-sm text-gray-500">
              Belum punya akun?{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/register')}
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
