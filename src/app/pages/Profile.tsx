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
            <Input id="name" defaultValue={user.name} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div>
            <Label htmlFor="email" className="dark:text-gray-300">Email</Label>
            <Input id="email" type="email" defaultValue={user.email} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <Button>Simpan Perubahan</Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Lock size={20} />
            Keamanan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <Lock size={16} />
            Ubah Password
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            onClick={() => navigate('/pin-setup')}
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
          >
            <LogOut size={16} />
            Keluar dari Akun
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}