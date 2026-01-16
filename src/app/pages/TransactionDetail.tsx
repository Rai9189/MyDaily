import { useNavigate, useParams } from 'react-router-dom';
import { dummyTransactions, dummyAccounts } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Upload, X } from 'lucide-react';

export function TransactionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  const transaction = isNew ? null : dummyTransactions.find(t => t.id === id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountName = (accountId: string) => {
    return dummyAccounts.find(a => a.id === accountId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/transactions')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl">
            {isNew ? 'Tambah Transaksi' : 'Detail Transaksi'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isNew ? 'Buat transaksi baru' : 'Lihat detail transaksi'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="account">Akun Keuangan</Label>
            <Select defaultValue={transaction?.accountId || dummyAccounts[0].id}>
              <SelectTrigger id="account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dummyAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Nominal</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              defaultValue={transaction?.amount || ''}
            />
          </div>

          <div>
            <Label htmlFor="type">Jenis Transaksi</Label>
            <Select defaultValue={transaction?.type || 'Keluar'}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masuk">Pemasukan</SelectItem>
                <SelectItem value="Keluar">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              defaultValue={transaction?.date || new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <Label htmlFor="category">Kategori</Label>
            <Input
              id="category"
              placeholder="Contoh: Makanan, Transport, dll"
              defaultValue={transaction?.category || ''}
            />
          </div>

          <div>
            <Label htmlFor="description">Deskripsi (Opsional)</Label>
            <Textarea
              id="description"
              placeholder="Tambahkan deskripsi transaksi..."
              defaultValue={transaction?.description || ''}
              rows={3}
            />
          </div>

          <div>
            <Label>Lampiran (Opsional)</Label>
            <div className="mt-2 space-y-2">
              <Button variant="outline" className="w-full gap-2">
                <Upload size={16} />
                Upload Image / PDF
              </Button>
              
              {transaction?.attachments && transaction.attachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  {transaction.attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{file.type}</Badge>
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!isNew && transaction && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Akun:</span>
              <span>{getAccountName(transaction.accountId)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jenis:</span>
              <Badge variant={transaction.type === 'Masuk' ? 'default' : 'destructive'}>
                {transaction.type}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nominal:</span>
              <span className={transaction.type === 'Masuk' ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(transaction.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal:</span>
              <span>{new Date(transaction.date).toLocaleDateString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button className="flex-1">
          {isNew ? 'Simpan Transaksi' : 'Update Transaksi'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/transactions')}>
          Batal
        </Button>
      </div>
    </div>
  );
}
