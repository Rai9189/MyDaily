import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User as UserIcon, Lock, LogOut, Tag, Camera, Loader2 } from 'lucide-react';

export function Profile() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile, loading } = useAuth();

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
    if (success) {
      alert('Profile berhasil diupdate!');
    } else {
      alert(error || 'Gagal update profile');
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    if (!confirm('Yakin ingin keluar dari akun?')) return;
    
    setSigningOut(true);
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">User tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl dark:text-white">Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola informasi akun Anda</p>
      </div>

      {/* Profile Picture */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                type="button"
              >
                <Camera size={16} />
              </Button>
            </div>
            <div>
              <h3 className="text-xl dark:text-white">{user.name}</h3>
              <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <form onSubmit={handleUpdateProfile}>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <UserIcon size={20} />
              Informasi Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="dark:text-gray-300">Nama Lengkap</Label>
              <Input 
                id="name" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
              />
            </div>

            <div>
              <Label htmlFor="email" className="dark:text-gray-300">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Email tidak dapat diubah
              </p>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Security */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Lock size={20} />
            Keamanan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            type="button"
            onClick={() => alert('Fitur ubah password akan diimplementasikan dengan Supabase Auth')}
          >
            <Lock size={16} />
            Ubah Password
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            onClick={() => navigate('/pin-setup')}
            type="button"
          >
            <Lock size={16} />
            Ubah PIN Keamanan
          </Button>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Tag size={20} />
            Kategori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            onClick={() => navigate('/categories')}
            type="button"
          >
            <Tag size={16} />
            Kelola Kategori
          </Button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Atur kategori untuk transaksi, tugas, dan notes
          </p>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-red-200 dark:border-red-900 dark:bg-gray-800">
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleLogout}
            disabled={signingOut}
            type="button"
          >
            {signingOut ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Keluar...
              </>
            ) : (
              <>
                <LogOut size={16} />
                Keluar dari Akun
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}