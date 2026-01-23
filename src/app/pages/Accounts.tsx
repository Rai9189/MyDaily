import { useState } from 'react';
import { useAccounts } from '../context/AccountContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Account, AccountType } from '../types';

export function Accounts() {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount } = useAccounts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Bank' as AccountType,
    balance: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Bank':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'E-Wallet':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'Cash':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleOpenDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        type: account.type,
        balance: account.balance,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        type: 'Bank',
        balance: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingAccount) {
        const { success, error } = await updateAccount(editingAccount.id, formData);
        if (success) {
          setIsDialogOpen(false);
        } else {
          alert(error || 'Gagal update akun');
        }
      } else {
        const { success, error } = await createAccount(formData);
        if (success) {
          setIsDialogOpen(false);
        } else {
          alert(error || 'Gagal membuat akun');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus akun ini?')) return;

    const { success, error } = await deleteAccount(id);
    if (!success) {
      alert(error || 'Gagal menghapus akun');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl dark:text-white">Akun Keuangan</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola semua akun keuangan Anda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus size={20} />
              Tambah Akun
            </Button>
          </DialogTrigger>
          <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name" className="dark:text-gray-300">Nama Akun</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: BCA Utama"
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="type" className="dark:text-gray-300">Tipe Akun</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: AccountType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank">Bank</SelectItem>
                    <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="balance" className="dark:text-gray-300">Saldo Awal</Label>
                <Input
                  id="balance"
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                  placeholder="0"
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  editingAccount ? 'Update Akun' : 'Simpan Akun'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg dark:text-white">{account.name}</CardTitle>
                  <Badge className={`mt-2 ${getTypeColor(account.type)}`}>
                    {account.type}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(account)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Saat Ini</p>
                <p className="text-2xl mt-1 dark:text-white">{formatCurrency(account.balance)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12 text-center text-gray-500 dark:text-gray-400">
            <p>Belum ada akun keuangan. Klik tombol "Tambah Akun" untuk memulai.</p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Akun</p>
              <p className="text-2xl dark:text-white">{accounts.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Saldo</p>
              <p className="text-2xl dark:text-white">
                {formatCurrency(accounts.reduce((sum, acc) => sum + acc.balance, 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bank</p>
              <p className="text-2xl dark:text-white">
                {accounts.filter(a => a.type === 'Bank').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">E-Wallet</p>
              <p className="text-2xl dark:text-white">
                {accounts.filter(a => a.type === 'E-Wallet').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}