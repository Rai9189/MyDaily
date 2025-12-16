import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dummyUser } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User as UserIcon, Lock, LogOut, Tag, Camera } from 'lucide-react';

export function Profile() {
  const navigate = useNavigate();
  const [user] = useState(dummyUser);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
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
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8"
              >
                <Camera size={16} />
              </Button>
            </div>
            <div>
              <h3 className="text-xl">{user.name}</h3>
              <p className="text-gray-500">{user.email}</p>
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
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input id="name" defaultValue={user.name} />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={user.email} />
          </div>

          <Button>Simpan Perubahan</Button>
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
          <Button variant="outline" className="w-full justify-start gap-2">
            <Lock size={16} />
            Ubah Password
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate('/pin-setup')}
          >
            <Lock size={16} />
            Ubah PIN Keamanan
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
