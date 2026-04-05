// src/app/pages/ForgotPassword.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ChevronLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';

export function ForgotPassword() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { resetPassword } = useAuth();

  const prefillEmail = location.state?.email || '';
  const fromProfile  = location.state?.fromProfile === true;

  const [email, setEmail]   = useState(prefillEmail);
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    await resetPassword(email);
    setSent(true);
    setLoading(false);
  };

  const handleBack = () => {
    if (fromProfile) navigate('/profile');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card className="border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-card shadow-lg rounded-2xl">
          <CardContent className="pt-8 pb-7 px-7">

            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="MyDaily" className="w-40 h-auto object-contain dark:invert" />
            </div>

            {!sent ? (
              <>
                {/* Header */}
                <div className="mb-5">
                  <button type="button" onClick={handleBack} disabled={loading}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
                    <ChevronLeft size={16} />
                    {fromProfile ? 'Back to Profile' : 'Back to Login'}
                  </button>
                  <h1 className="text-xl font-semibold text-foreground">
                    {fromProfile ? 'Change Password' : 'Forgot Password'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    We'll send a reset link to your email
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border-2 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email" type="email" placeholder="name@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      required disabled={loading || !!prefillEmail}
                      className={prefillEmail ? 'opacity-70 cursor-not-allowed' : ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll send a reset link to this address.
                    </p>
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" /> Sending...</>
                      : 'Send Reset Link'
                    }
                  </Button>

                  {!fromProfile && (
                    <p className="text-center text-sm text-muted-foreground">
                      Remember your password?{' '}
                      <Button type="button" variant="link" className="p-0 h-auto font-medium"
                        onClick={() => navigate('/login')} disabled={loading}>
                        Sign in
                      </Button>
                    </p>
                  )}
                </form>
              </>
            ) : (
              /* Success state */
              <div className="text-center space-y-4 py-2">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link has been sent. Check your inbox or spam folder.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">The link will expire in 1 hour.</p>
                </div>
                <Button onClick={handleBack} className="w-full">
                  {fromProfile ? 'Back to Profile' : 'Back to Login'}
                </Button>
                <Button type="button" variant="link" className="text-sm text-muted-foreground"
                  onClick={() => setSent(false)}>
                  Resend email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}