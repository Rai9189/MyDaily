import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';

export function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();

  // Terima email pre-filled dari Profile (via navigate state)
  // Contoh: navigate('/forgot-password', { state: { email: user.email } })
  const prefillEmail = location.state?.email || '';

  const [email, setEmail] = useState(prefillEmail);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selalu tampilkan pesan generik agar tidak bocorkan
  // apakah email terdaftar atau tidak (anti-enumeration)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Selalu tampilkan "sent" meski email tidak terdaftar
    // Ini mencegah attacker mengetahui email mana yang valid
    await resetPassword(email);
    setSent(true);
    setLoading(false);
  };

  // Tentukan ke mana tombol back mengarah
  // Jika datang dari Profile (ada state.fromProfile) → back ke /profile
  // Jika tidak → back ke /login
  const handleBack = () => {
    if (location.state?.fromProfile) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-0"
            onClick={handleBack}
            disabled={loading}
          >
            <ArrowLeft size={20} />
          </Button>

          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <CardTitle className="text-3xl dark:text-white">
            {location.state?.fromProfile ? 'Change Password' : 'Forgot Password'}
          </CardTitle>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {sent ? 'Email sent!' : 'Reset your password'}
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
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || !!prefillEmail}
                  className={`dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    prefillEmail ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  We'll send a password reset link to this email address.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              {!location.state?.fromProfile && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Remember your password?{' '}
                  <Button type="button" variant="link" className="p-0 h-auto" onClick={() => navigate('/login')} disabled={loading}>
                    Sign in
                  </Button>
                </div>
              )}
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
                  If an account exists for
                </p>
                <p className="font-semibold dark:text-white mt-1">{email}</p>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  a reset link has been sent. Check your inbox or spam folder.
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The link will expire in 1 hour.
              </p>
              <Button onClick={handleBack} className="w-full">
                {location.state?.fromProfile ? 'Back to Profile' : 'Back to Login'}
              </Button>
              <Button type="button" variant="link" className="text-sm" onClick={() => setSent(false)}>
                Resend email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}