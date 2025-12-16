import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dummyTransactions, dummyAccounts, dummyCategories } from '../data/dummyData';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, TrendingUp, TrendingDown, Paperclip, ArrowUpDown, Trash2, Edit } from 'lucide-react';
import { Transaction } from '../types';

export function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>(dummyTransactions);
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const getCategoryName = (categoryId: string) => {
    return dummyCategories.find(c => c.id === categoryId)?.name || 'Lainnya';
  };

  const getCategoryColor = (categoryId: string) => {
    return dummyCategories.find(c => c.id === categoryId)?.color || '#gray';
  };

  const transactionCategories = dummyCategories.filter(c => c.type === 'transaction');

  const handleSoftDelete = (transactionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTransactions(transactions.map(t =>
      t.id === transactionId ? { ...t, deleted: true, deletedAt: new Date().toISOString() } : t
    ));
  };

  const handleRestore = (transactionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTransactions(transactions.map(t =>
      t.id === transactionId ? { ...t, deleted: false, deletedAt: undefined } : t
    ));
  };

  let filteredTransactions = transactions.filter(t => {
    if (!showDeleted && t.deleted) return false;
    if (filterAccount !== 'all' && t.accountId !== filterAccount) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.categoryId !== filterCategory) return false;
    return true;
  });

  // Sort transactions
  filteredTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    } else {
      return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl">Transaksi</h1>
          <p className="text-gray-500 mt-1">Riwayat semua transaksi Anda</p>
        </div>
        <Button onClick={() => navigate('/transactions/new')} className="gap-2">
          <Plus size={20} />
          Tambah Transaksi
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Filter Akun</label>
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Akun</SelectItem>
                  {dummyAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Filter Jenis</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="Masuk">Pemasukan</SelectItem>
                  <SelectItem value="Keluar">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Filter Kategori</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {transactionCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Urutkan</label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v: 'date' | 'amount') => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Tanggal</SelectItem>
                    <SelectItem value="amount">Nominal</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown size={16} />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-2 block">Tampilkan</label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showDeleted"
                  checked={showDeleted}
                  onCheckedChange={(checked) => setShowDeleted(checked as boolean)}
                />
                <label htmlFor="showDeleted" className="text-sm cursor-pointer">
                  Transaksi Dihapus
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.map((transaction) => (
          <Card
            key={transaction.id}
            className={`hover:shadow-md transition-shadow ${
              transaction.deleted ? 'border-red-200 bg-red-50' : 'cursor-pointer'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1" onClick={() => !transaction.deleted && navigate(`/transactions/${transaction.id}`)}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {transaction.type === 'Masuk' ? (
                      <TrendingUp className="text-green-600" size={20} />
                    ) : (
                      <TrendingDown className="text-red-600" size={20} />
                    )}
                    <Badge variant={transaction.type === 'Masuk' ? 'default' : 'destructive'}>
                      {transaction.type}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      style={{ 
                        borderColor: getCategoryColor(transaction.categoryId),
                        color: getCategoryColor(transaction.categoryId)
                      }}
                    >
                      {getCategoryName(transaction.categoryId)}
                    </Badge>
                    {transaction.attachments && transaction.attachments.length > 0 && (
                      <Paperclip size={16} className="text-gray-400" />
                    )}
                    {transaction.deleted && (
                      <Badge variant="destructive" className="gap-1">
                        <Trash2 size={12} />
                        Dihapus
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500">{getAccountName(transaction.accountId)}</p>
                  {transaction.description && (
                    <p className="text-sm text-gray-500 mt-1">{transaction.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(transaction.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="text-right flex flex-col gap-2">
                  <p
                    className={`text-xl ${
                      transaction.type === 'Masuk' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'Masuk' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                  
                  <div className="flex gap-2">
                    {!transaction.deleted ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/transactions/${transaction.id}`);
                          }}
                        >
                          <Edit size={14} />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-red-600 hover:bg-red-50"
                          onClick={(e) => handleSoftDelete(transaction.id, e)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-green-600 hover:bg-green-50"
                        onClick={(e) => handleRestore(transaction.id, e)}
                      >
                        Pulihkan
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <p>Tidak ada transaksi ditemukan</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}