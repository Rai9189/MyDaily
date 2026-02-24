import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { User as UserIcon, Lock, LogOut, Tag, Save, Loader2, Sun, Moon, Monitor } from 'lucide-react';

export function Profile() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile, loading } = useAuth();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { success, error } = await updateProfile(formData);
    if (success) alert('Profile updated successfully!');
    else alert(error || 'Failed to update profile');
    setSubmitting(false);
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    sessionStorage.removeItem('pinUnlocked');
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
        <p className="text-destructive">User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      {/* Avatar + Name */}
      <Card className="border border-border bg-card">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <form onSubmit={handleUpdateProfile}>
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UserIcon size={18} />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Save size={15} /> Save Changes</>
              }
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Security — urutan pertama setelah Personal Info */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Lock size={18} />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            type="button"
            onClick={() => alert('Change password feature coming soon')}
          >
            <Lock size={15} />
            Change Password
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate('/pin-setup')}
            type="button"
          >
            <Lock size={15} />
            Change Security PIN
          </Button>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Tag size={18} />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate('/categories')}
            type="button"
          >
            <Tag size={15} />
            Manage Categories
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Customize categories for transactions, tasks, and notes
          </p>
        </CardContent>
      </Card>

      {/* Appearance — paling bawah */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Sun size={18} />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v: 'light' | 'dark' | 'system') => setTheme(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun size={15} /> Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon size={15} /> Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor size={15} /> System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out — hanya tampil di mobile (md ke bawah) */}
      <Card className="border border-destructive/30 bg-card md:hidden">
        <CardContent className="pt-5 pb-5">
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleLogout}
            disabled={signingOut}
            type="button"
          >
            {signingOut
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing out...</>
              : <><LogOut size={15} /> Sign Out</>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}