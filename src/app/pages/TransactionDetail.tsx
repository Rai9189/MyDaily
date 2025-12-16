import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dummyTransactions, dummyAccounts, dummyCategories } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { ArrowLeft, Save, Trash2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const transaction = dummyTransactions.find(t => t.id === id);
  
  const [accountId, setAccountId] = useState(transaction?.accountId || '');
  const [amount, setAmount] = useState(transaction?.amount.toString() || '');
  const [type, setType] = useState<'Masuk' | 'Keluar'>(transaction?.type || 'Keluar');
  const [date, setDate] = useState(transaction?.date || '');
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');
  const [description, setDescription] = useState(transaction?.description || '');
  
  const [showSoftDeleteDialog, setShowSoftDeleteDialog] = useState(false);
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false);

  const transactionCategories = dummyCategories.filter(c => c.type === 'transaction');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSave = () => {
    // In real app, save to state/database
    alert('Transaksi berhasil disimpan!');
    navigate('/transactions');
  };

  const handleSoftDelete = () => {
    // Mark as deleted
    alert('Transaksi dipindahkan ke tempat sampah. Anda masih bisa memulihkannya.');
    setShowSoftDeleteDialog(false);
    navigate('/transactions');
  };

  const handleHardDelete = () => {
    // Permanent delete
    alert('Transaksi berhasil dihapus permanen!');
    setShowHardDeleteDialog(false);
    navigate('/transactions');
  };

  if (!transaction && id !== 'new') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/transactions')} className="gap-2">
          <ArrowLeft size={20} />
          Kembali
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Transaksi tidak ditemukan</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate('/transactions')} className="gap-2">
          <ArrowLeft size={20} />
          Kembali
        </Button>
        {id !== 'new' && (
          <Badge variant={type === 'Masuk' ? 'default' : 'destructive'} className="gap-2">
            {type === 'Masuk' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {type}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{id === 'new' ? 'Tambah Transaksi Baru' : 'Detail Transaksi'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="type">Jenis Transaksi</Label>
            <Select value={type} onValueChange={(v: 'Masuk' | 'Keluar') => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masuk">Pemasukan</SelectItem>
                <SelectItem value="Keluar">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="account">Akun</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih akun" />
              </SelectTrigger>
              <SelectContent>
                {dummyAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} - {formatCurrency(acc.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Nominal</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                Rp
              </span>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pl-12"
              />
            </div>
            {amount && (
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(parseInt(amount) || 0)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="category">Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {transactionCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Deskripsi (Opsional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tambahkan catatan atau detail transaksi..."
              rows={4}
            />
          </div>

          <Button onClick={handleSave} className="w-full gap-2">
            <Save size={20} />
            Simpan Transaksi
          </Button>
        </CardContent>
      </Card>

      {/* Delete Options - Only show for existing transactions */}
      {id !== 'new' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle size={20} />
              Zona Berbahaya
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2 text-orange-600 border-orange-600 hover:bg-orange-50"
                onClick={() => setShowSoftDeleteDialog(true)}
              >
                <Trash2 size={16} />
                Hapus Sementara
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => setShowHardDeleteDialog(true)}
              >
                <Trash2 size={16} />
                Hapus Permanen
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              <strong>Hapus Sementara:</strong> Transaksi dipindahkan ke tempat sampah dan masih bisa dipulihkan.<br />
              <strong>Hapus Permanen:</strong> Transaksi akan dihapus selamanya dan tidak bisa dipulihkan.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Soft Delete Dialog */}
      <Dialog open={showSoftDeleteDialog} onOpenChange={setShowSoftDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Transaksi Sementara?</DialogTitle>
            <DialogDescription>
              Transaksi akan dipindahkan ke tempat sampah. Anda masih bisa memulihkannya nanti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSoftDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="default" onClick={handleSoftDelete}>
              Ya, Hapus Sementara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Dialog */}
      <Dialog open={showHardDeleteDialog} onOpenChange={setShowHardDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus Transaksi Permanen?</DialogTitle>
            <DialogDescription>
              <strong className="text-red-600">Peringatan!</strong> Transaksi akan dihapus selamanya dan tidak bisa dipulihkan. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHardDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleHardDelete}>
              Ya, Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
