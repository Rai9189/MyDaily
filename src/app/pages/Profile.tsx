import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { User as UserIcon, Lock, LogOut, Tag, Save, Loader2, Sun, Moon, Monitor, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function Profile() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile, loading } = useAuth();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // ✅ FIX: State untuk change password
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // ✅ FIX: Ref untuk input file avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { success, error } = await updateProfile({ name: formData.name });
    if (success) alert('Profile updated successfully!');
    else alert(error || 'Failed to update profile');
    setSubmitting(false);
  };

  // ✅ FIX: Upload avatar ke Supabase Storage
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, and WebP images are supported');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { success, error } = await updateProfile({ avatar: avatarUrl });

      if (success) alert('Profile photo updated!');
      else throw new Error(error || 'Failed to save avatar URL');
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // ✅ FIX: Change password menggunakan Supabase Auth
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      alert('Password changed successfully!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
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

      {/* ✅ FIX: Avatar dengan tombol upload */}
      <Card className="border border-border bg-card">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* ✅ Tombol kamera di atas avatar */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {uploadingAvatar
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Camera size={12} />
                }
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-xs text-primary hover:underline mt-0.5"
              >
                {uploadingAvatar ? 'Uploading...' : 'Change photo'}
              </button>
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

      {/* Security */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Lock size={18} />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">

          {/* ✅ FIX: Change Password — toggle form inline */}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            type="button"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            <Lock size={15} />
            Change Password
          </Button>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="space-y-3 pt-1 pb-1">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 gap-2" disabled={changingPassword}>
                  {changingPassword
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : 'Update Password'
                  }
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* ✅ FIX: Change Security PIN → navigate ke /pin-setup dengan state isChanging */}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate('/pin-setup', { state: { forgotPin: true } })}
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

      {/* ✅ FIX: Appearance — setTheme sudah terhubung ke ThemeContext yang benar */}
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

      {/* Sign Out — hanya tampil di mobile */}
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