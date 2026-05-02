// src/app/pages/Register.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, Loader2, Check, X, UserPlus } from 'lucide-react';

interface PasswordRule { label: string; test: (pw: string) => boolean; }

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters',              test: pw => pw.length >= 8 },
  { label: 'Contains uppercase letter (A–Z)',     test: pw => /[A-Z]/.test(pw) },
  { label: 'Contains lowercase letter (a–z)',     test: pw => /[a-z]/.test(pw) },
  { label: 'Contains number (0–9)',               test: pw => /[0-9]/.test(pw) },
  { label: 'Contains special character (!@#$…)',  test: pw => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(password: string) {
  const score = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (score <= 1) return { score, label: 'Very weak',  color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Weak',      color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Fair',      color: 'bg-amber-500' };
  if (score === 4) return { score, label: 'Strong',    color: 'bg-blue-500' };
  return             { score, label: 'Very strong', color: 'bg-green-500' };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidName(name: string) {
  return name.trim().length >= 2 && /^[a-zA-Z\s'-]+$/.test(name.trim());
}

export function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [name, setName]                               = useState('');
  const [email, setEmail]                             = useState('');
  const [password, setPassword]                       = useState('');
  const [confirmPassword, setConfirmPassword]         = useState('');
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading]                         = useState(false);
  const [error, setError]                             = useState<string | null>(null);

  const [nameTouched, setNameTouched]   = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const strength       = useMemo(() => getStrength(password), [password]);
  const allRulesPassed = PASSWORD_RULES.every(r => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const nameError = nameTouched && !isValidName(name)
    ? name.trim().length === 0
      ? 'Full name is required.'
      : name.trim().length < 2
        ? 'Name must be at least 2 characters.'
        : 'Name can only contain letters, spaces, hyphens, and apostrophes.'
    : null;

  const emailError = emailTouched && email.length > 0 && !isValidEmail(email)
    ? 'Please enter a valid email address.'
    : null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNameTouched(true);
    setEmailTouched(true);

    if (!isValidName(name))           return;
    if (!isValidEmail(email))         return;
    if (!allRulesPassed)              return;
    if (password !== confirmPassword) return;

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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-start justify-center p-4 py-8 overflow-y-auto">
      <div className="w-full max-w-sm">
        <Card className="border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-card shadow-lg rounded-2xl">
          <CardContent className="pt-8 pb-7 px-7">

            {/* Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                <UserPlus size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Create account</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign up to get started</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4" noValidate>

              {/* Server error */}
              {error && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border-2 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  <X size={15} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  disabled={loading}
                  className={nameError ? 'border-red-400 dark:border-red-600' : ''}
                />
                {nameError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X size={11} className="shrink-0" /> {nameError}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  disabled={loading}
                  className={emailError ? 'border-red-400 dark:border-red-600' : ''}
                />
                {emailError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X size={11} className="shrink-0" /> {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {/* Strength bar — hanya muncul kalau ada input */}
                  {password.length > 0 && (
                    <>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              i < strength.score ? strength.color : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        strength.score <= 2 ? 'text-red-500' :
                        strength.score === 3 ? 'text-amber-500' : 'text-green-500'
                      }`}>{strength.label}</p>
                    </>
                  )}

                  {/* Rules list — selalu tampil dari awal */}
                  <ul className="space-y-1">
                    {PASSWORD_RULES.map(rule => {
                      const passed = rule.test(password);
                      return (
                        <li key={rule.label} className="flex items-center gap-1.5">
                          {passed
                            ? <Check size={12} className="text-green-500 shrink-0" />
                            : <X size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
                          }
                          <span className={`text-xs ${
                            passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                          }`}>
                            {rule.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className={`pr-10 ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? 'border-green-400 dark:border-green-600'
                          : 'border-red-400 dark:border-red-600'
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-xs flex items-center gap-1 ${
                    passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                  }`}>
                    {passwordsMatch
                      ? <><Check size={11} className="shrink-0" /> Passwords match</>
                      : <><X size={11} className="shrink-0" /> Passwords do not match</>
                    }
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full gap-2 h-11 text-sm font-semibold mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating your account…</span>
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              {/* Sign in link — di dalam card */}
              <p className="text-center text-sm text-muted-foreground pt-1">
                Already have an account?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold text-blue-600 dark:text-blue-400"
                  onClick={() => navigate('/login')}
                  disabled={loading}
                >
                  Sign in
                </Button>
              </p>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}