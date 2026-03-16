// src/app/pages/Profile.tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  User as UserIcon, LogOut, Save, Loader2, Camera,
  AlertCircle, CheckCircle2, Trash2, Mail, ShieldAlert,
  Lock, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* ── Notification ── */
function Notification({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm ${
      type === 'success'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
    }`}>
      {type === 'success'
        ? <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
        : <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
      }
      {message}
    </div>
  );
}

/* ── Component ── */
export function Profile() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile, loading } = useAuth();

  const [formData, setFormData] = useState({ name: user?.name || '', email: user?.email || '' });
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  /* ── Save button only active if name actually changed ── */
  const hasChanged = formData.name.trim() !== displayName.trim() && formData.name.trim() !== '';

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { success, error } = await updateProfile({ name: formData.name });
    if (success) {
      setDisplayName(formData.name);
      showNotif('success', 'Profile updated successfully!');
    } else {
      showNotif('error', error || 'Failed to update profile');
    }
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!user) return (
    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
      <p className="text-destructive">User not found</p>
    </div>
  );

  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* ── Header ── */}
          <p className="text-sm font-medium text-foreground/65">Your Account Information</p>

          {/* ── Notification ── */}
          {notification && <Notification type={notification.type} message={notification.message} />}

          {/* ── Profile Hero Card ── */}
          <Card className="bg-primary text-primary-foreground border-0 shadow-lg rounded-xl">
            <CardContent className="pt-5 pb-5 px-5">
              <div className="flex items-center gap-5">
                {/* Avatar — bigger, brighter ring */}
                <div className="relative flex-shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-20 h-20 rounded-full object-cover ring-3 ring-white/50 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/25 flex items-center justify-center text-3xl font-bold ring-3 ring-white/50 shadow-lg">
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center text-primary hover:bg-white/90 transition-colors shadow-md"
                  >
                    {uploadingAvatar
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Camera size={13} />
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

                {/* Info — name bigger, secondary text more visible */}
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold leading-tight truncate">{displayName}</p>
                  <p className="text-sm opacity-80 truncate mt-0.5">{user.email}</p>
                  {user.created_at && (
                    <p className="text-xs opacity-65 mt-0.5">
                      Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="text-xs opacity-90 hover:opacity-100 underline mt-2 transition-opacity block"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                  </button>
                  <p className="text-xs opacity-55 mt-0.5">Max 2MB · JPEG, PNG, WebP</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Security shortcut ── */}
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-card border-2 border-slate-200 dark:border-border rounded-xl shadow-sm hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Lock size={13} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground leading-tight">Security Settings</p>
                <p className="text-xs text-muted-foreground">Password & PIN</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>

          {/* ── Personal Info Form ── */}
          <form onSubmit={handleUpdateProfile}>
            <Card className="bg-white dark:bg-card border-2 border-blue-200 dark:border-blue-900/50 shadow-sm rounded-xl">
              <CardContent className="pt-4 pb-4 px-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <UserIcon size={15} className="text-primary" />
                  Personal Information
                </div>

                {/* Name + Email side by side on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <Label htmlFor="email" className="flex items-center gap-1.5">
                      <Mail size={12} className="text-muted-foreground" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">Cannot be changed</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className={`w-full gap-2 transition-opacity ${!hasChanged && !submitting ? 'opacity-40 cursor-not-allowed' : 'opacity-100'}`}
                  disabled={submitting || !hasChanged}
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : <><Save size={14} /> Save Changes</>
                  }
                </Button>
              </CardContent>
            </Card>
          </form>

          {/* ── Sign Out (mobile only) ── */}
          <Card className="border-2 border-red-200 dark:border-red-900/40 bg-white dark:bg-card shadow-sm rounded-xl md:hidden">
            <CardContent className="pt-4 pb-4 px-4">
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleLogout}
                disabled={signingOut}
                type="button"
              >
                {signingOut
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing out...</>
                  : <><LogOut size={14} /> Sign Out</>
                }
              </Button>
            </CardContent>
          </Card>

          {/* ── Danger Zone ── */}
          <Card className="bg-white dark:bg-card border-2 border-red-200 dark:border-red-900/40 shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <ShieldAlert size={15} />
                Danger Zone
              </div>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-red-200 dark:border-red-800 text-destructive text-sm font-medium hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              ) : (
                <div className="space-y-3 p-3.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={15} className="text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-destructive mb-1.5">This will permanently delete:</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                        <li>All transactions, tasks, and notes</li>
                        <li>All accounts and categories</li>
                        <li>Profile photo and personal data</li>
                        <li>Login credentials</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="deleteConfirm" className="text-xs text-muted-foreground">
                      Type <span className="font-bold text-destructive">DELETE</span> to confirm
                    </Label>
                    <Input
                      id="deleteConfirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE here"
                      disabled={deletingAccount}
                      className="border-red-200 dark:border-red-800/50 focus:border-destructive text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1 gap-2 text-sm"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                    >
                      {deletingAccount
                        ? <><Loader2 size={13} className="animate-spin" /> Deleting...</>
                        : <><Trash2 size={13} /> Confirm Delete</>
                      }
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-sm"
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
      </div>
    </div>
  );
}