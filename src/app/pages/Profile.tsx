import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User as UserIcon, Lock, LogOut, Tag, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';

export function Profile() {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut } = useAuth();

  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Nama tidak boleh kosong');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile({ name: name.trim() });
      setSuccess('Profile berhasil diupdate!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.message || 'Gagal update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getPinTypeLabel = (pinType: string | null) => {
    if (!pinType) return 'Belum setup';
    if (pinType === 'pin4') return 'PIN 4 Digit';
    if (pinType === 'pin6') return 'PIN 6 Digit';
    return 'Password';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Profile</h1>
        <p className="text-gray-500 mt-1">Kelola informasi akun Anda</p>
      </div>

      {/* Profile Picture */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-semibold">
                {profile?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                disabled
              >
                <Camera size={16} />
              </Button>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{profile?.name || 'User'}</h3>
              <p className="text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                Member since {new Date(profile?.created_at || '').toLocaleDateString('id-ID', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon size={20} />
            Informasi Personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Success Alert */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email tidak dapat diubah
              </p>
            </div>

            <Button type="submit" disabled={loading || name === profile?.name}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={20} />
            Keamanan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Tipe Keamanan</p>
                <p className="text-sm text-gray-600">
                  {getPinTypeLabel(profile?.pin_type || null)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/pin-setup')}
                size="sm"
              >
                Ubah PIN
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled
          >
            <Lock size={16} />
            Ubah Password (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag size={20} />
            Kategori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate('/categories')}
          >
            <Tag size={16} />
            Kelola Kategori
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Atur kategori untuk transaksi, tugas, dan notes
          </p>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Keluar dari Akun
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}