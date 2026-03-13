import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';

// ============================================
// PASSWORD STRENGTH CHECKER
// ============================================
interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters',              test: pw => pw.length >= 8 },
  { label: 'Contains uppercase letter (A–Z)',     test: pw => /[A-Z]/.test(pw) },
  { label: 'Contains lowercase letter (a–z)',     test: pw => /[a-z]/.test(pw) },
  { label: 'Contains number (0–9)',               test: pw => /[0-9]/.test(pw) },
  { label: 'Contains special character (!@#$…)',  test: pw => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  const score = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (score <= 1) return { score, label: 'Very weak',  color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Weak',       color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Fair',       color: 'bg-yellow-500' };
  if (score === 4) return { score, label: 'Strong',     color: 'bg-blue-500' };
  return              { score, label: 'Very strong', color: 'bg-green-500' };
}

export function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const allRulesPassed = PASSWORD_RULES.every(r => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validasi semua rules password
    if (!allRulesPassed) {
      setError('Password does not meet the requirements below.');
      setPasswordTouched(true);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { success, error: signUpError } = await signUp(email, password, name);

    if (success) {
      navigate('/pin-setup');
    } else {
      setError(signUpError || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6 pb-6">
          <div className="flex justify-center mb-5">
            <img
              src="/logo.png"
              alt="MyDaily"
              className="w-72 h-auto object-contain dark:invert"
            />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1">
              <Label htmlFor="name" className="dark:text-gray-300">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email" className="dark:text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="password" className="dark:text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true); }}
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

              {/* Strength bar — tampil setelah user mulai mengetik */}
              {passwordTouched && password.length > 0 && (
                <div className="mt-2 space-y-2">
                  {/* Bar */}
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i < strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength.score <= 2 ? 'text-red-500' :
                    strength.score === 3 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {strength.label}
                  </p>

                  {/* Rules checklist */}
                  <ul className="space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(password);
                      return (
                        <li key={rule.label} className="flex items-center gap-1.5">
                          {passed
                            ? <Check size={13} className="text-green-500 shrink-0" />
                            : <X size={13} className="text-red-400 shrink-0" />
                          }
                          <span className={`text-xs ${
                            passed
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {rule.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="dark:text-gray-300">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-green-400 dark:border-green-600'
                        : 'border-red-400 dark:border-red-600'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs mt-1 ${passwordsMatch ? 'text-green-500' : 'text-red-400'}`}>
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !allRulesPassed || !passwordsMatch}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Sign in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}