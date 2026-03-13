import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User as UserIcon, LogOut, Save, Loader2, Camera, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

function Notification({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`p-3 rounded-lg border flex items-start gap-2 ${
      type === 'success'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
        : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      }
      <p className={`text-sm ${
        type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'
      }`}>{message}</p>
    </div>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile, loading } = useAuth();

  const [formData, setFormData] = useState({ name: user?.name || '', email: user?.email || '' });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { success, error } = await updateProfile({ name: formData.name });
    if (success) showNotif('success', 'Profile updated successfully!');
    else showNotif('error', error || 'Failed to update profile');
    setSubmitting(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      showNotif('error', 'Only JPEG, PNG, and WebP images are supported');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotif('error', 'Image must be smaller than 2MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const { success, error } = await updateProfile({ avatar: `${urlData.publicUrl}?t=${Date.now()}` });
      if (success) showNotif('success', 'Profile photo updated!');
      else throw new Error(error || 'Failed to save avatar URL');
    } catch (err: any) {
      showNotif('error', err.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    sessionStorage.removeItem('pinUnlocked');
    await signOut();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      sessionStorage.clear();
      await signOut();
      navigate('/login');
    } catch (err: any) {
      showNotif('error', err.message || 'Failed to delete account. Please try again.');
      setDeletingAccount(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg"><p className="text-destructive">User not found</p></div>;

  return (
    <div className="space-y-5 p-1">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Your account information</p>
      </div>

      {notification && <Notification type={notification.type} message={notification.message} />}

      {/* Avatar */}
      <Card className="border border-border bg-card">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="text-xs text-primary hover:underline mt-0.5">
                {uploadingAvatar ? 'Uploading...' : 'Change photo'}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <form onSubmit={handleUpdateProfile}>
        <Card className="border border-border bg-card">
          <CardContent className="space-y-4 pt-5 pb-5">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UserIcon size={18} /> Personal Information
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} disabled className="opacity-60 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save size={15} /> Save Changes</>}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Sign Out — mobile only */}
      <Card className="border border-destructive/30 bg-card md:hidden">
        <CardContent className="pt-5 pb-5">
          <Button variant="destructive" className="w-full gap-2" onClick={handleLogout} disabled={signingOut} type="button">
            {signingOut ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing out...</> : <><LogOut size={15} /> Sign Out</>}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border border-destructive/40 bg-card">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-destructive">
            <Trash2 size={18} /> Danger Zone
          </div>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={15} /> Delete Account
            </Button>
          ) : (
            <div className="space-y-3 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">This will permanently delete:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li>All your transactions, tasks, and notes</li>
                    <li>All your accounts and categories</li>
                    <li>Your profile photo and personal data</li>
                    <li>Your login credentials</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deleteConfirm" className="text-sm text-muted-foreground">
                  Type <span className="font-bold text-destructive">DELETE</span> to confirm
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  disabled={deletingAccount}
                  className="border-destructive/30 focus:border-destructive"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                >
                  {deletingAccount
                    ? <><Loader2 size={14} className="animate-spin" /> Deleting...</>
                    : <><Trash2 size={14} /> Confirm Delete</>
                  }
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  disabled={deletingAccount}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}