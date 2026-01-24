import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Upload, X, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { formatFileSize, isImageFile } from '../../lib/supabase';

export function TransactionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  
  const { getTransactionById, createTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { getCategoriesByType } = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();
  
  const transaction = isNew ? null : getTransactionById(id!);
  const transactionCategories = getCategoriesByType('transaction');

  const [formData, setFormData] = useState({
    accountId: transaction?.accountId || (accounts[0]?.id || ''),
    amount: transaction?.amount || 0,
    type: transaction?.type || 'Keluar' as 'Masuk' | 'Keluar',
    date: transaction?.date || new Date().toISOString().split('T')[0],
    categoryId: transaction?.categoryId || (transactionCategories[0]?.id || ''),
    description: transaction?.description || '',
  });

  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load attachments if editing
  useEffect(() => {
    if (!isNew && id) {
      loadAttachments();
    }
  }, [id]);

  useEffect(() => {
    if (transaction) {
      setFormData({
        accountId: transaction.accountId,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        categoryId: transaction.categoryId,
        description: transaction.description || '',
      });
    }
  }, [transaction]);

  const loadAttachments = async () => {
    if (!id) return;
    const { data } = await getAttachments('transaction', id);
    if (data) setAttachments(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || 'Unknown';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { success, data, error } = await uploadAttachment(file, 'transaction', id);
      
      if (success && data) {
        setAttachments(prev => [...prev, data]);
      } else {
        alert(error || 'Gagal upload file');
      }
    }

    setUploading(false);
    e.target.value = ''; // Reset input
  };

  const handleDeleteAttachment = async (attachmentId: string, url: string) => {
    if (!confirm('Hapus lampiran ini?')) return;

    const { success, error } = await deleteAttachment(attachmentId, url);
    if (success) {
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } else {
      alert(error || 'Gagal menghapus lampiran');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isNew) {
        const { success, data, error } = await createTransaction(formData);
        if (success && data) {
          // If there are attachments uploaded before save, we need to re-associate them
          // For now, just navigate to list
          navigate('/transactions');
        } else {
          alert(error || 'Gagal membuat transaksi');
        }
      } else {
        const { success, error } = await updateTransaction(id!, formData);
        if (success) {
          navigate('/transactions');
        } else {
          alert(error || 'Gagal update transaksi');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus transaksi ini? Semua lampiran juga akan dihapus.')) return;
    
    setDeleting(true);
    const { success, error } = await deleteTransaction(id!);
    if (success) {
      navigate('/transactions');
    } else {
      alert(error || 'Gagal menghapus transaksi');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/transactions')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl dark:text-white">
            {isNew ? 'Tambah Transaksi' : 'Detail Transaksi'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isNew ? 'Buat transaksi baru' : 'Lihat detail transaksi'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Informasi Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="account" className="dark:text-gray-300">Akun Keuangan</Label>
              <Select 
                value={formData.accountId} 
                onValueChange={(value) => setFormData({ ...formData, accountId: value })}
              >
                <SelectTrigger id="account" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount" className="dark:text-gray-300">Nominal</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="type" className="dark:text-gray-300">Jenis Transaksi</Label>
              <Select 
                value={formData.type}
                onValueChange={(value: 'Masuk' | 'Keluar') => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masuk">Pemasukan</SelectItem>
                  <SelectItem value="Keluar">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date" className="dark:text-gray-300">Tanggal</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="category" className="dark:text-gray-300">Kategori</Label>
              <Select 
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger id="category" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description" className="dark:text-gray-300">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                placeholder="Tambahkan deskripsi transaksi..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Attachments Section - Only show if not new or if transaction exists */}
        {!isNew && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Lampiran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="dark:text-gray-300">Upload File (Maksimal 10MB)</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tipe file: Gambar (JPEG, PNG, GIF, WebP) atau PDF. Maksimal 10MB per file.
                  </p>
                  
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengupload...
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {attachments.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isImageFile(file.name) ? (
                              <ImageIcon size={20} className="text-blue-600 flex-shrink-0" />
                            ) : (
                              <FileText size={20} className="text-red-600 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate dark:text-white">{file.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex-shrink-0"
                            >
                              Lihat
                            </a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2 flex-shrink-0"
                            onClick={() => handleDeleteAttachment(file.id, file.url)}
                          >
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
        )}

        {isNew && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              💡 <strong>Tips:</strong> Simpan transaksi terlebih dahulu, lalu Anda bisa menambahkan lampiran.
            </p>
          </div>
        )}

        {!isNew && transaction && (
          <Card className="bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Akun:</span>
                <span className="dark:text-white">{getAccountName(transaction.accountId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Jenis:</span>
                <Badge variant={transaction.type === 'Masuk' ? 'default' : 'destructive'}>
                  {transaction.type}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Nominal:</span>
                <span className={`dark:text-white ${transaction.type === 'Masuk' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Tanggal:</span>
                <span className="dark:text-white">{new Date(transaction.date).toLocaleDateString('id-ID')}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              isNew ? 'Simpan Transaksi' : 'Update Transaksi'
            )}
          </Button>
          
          {!isNew && (
            <Button 
              type="button"
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </Button>
          )}
          
          <Button type="button" variant="outline" onClick={() => navigate('/transactions')}>
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}