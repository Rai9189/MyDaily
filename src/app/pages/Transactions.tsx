import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, TrendingUp, TrendingDown, Paperclip, ArrowUpDown, List, LayoutGrid, ChevronLeft, ChevronRight, Filter, Search, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';

export function Transactions() {
  const navigate = useNavigate();
  const { transactions, loading, error } = useTransactions();
  const { accounts } = useAccounts();
  const { categories, getCategoriesByType } = useCategories();
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const transactionCategories = getCategoriesByType('transaction');

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

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Lainnya';
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.color || '#gray';
  };

  // Filter and sort
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => {
        const matchesDescription = t.description?.toLowerCase().includes(query);
        const matchesAccount = getAccountName(t.accountId).toLowerCase().includes(query);
        const matchesCategory = getCategoryName(t.categoryId).toLowerCase().includes(query);
        const matchesAmount = t.amount.toString().includes(query);
        return matchesDescription || matchesAccount || matchesCategory || matchesAmount;
      });
    }

    if (filterAccount !== 'all') {
      result = result.filter(t => t.accountId === filterAccount);
    }
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }
    if (filterCategory !== 'all') {
      result = result.filter(t => t.categoryId === filterCategory);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return result;
  }, [transactions, searchQuery, filterAccount, filterType, filterCategory, sortBy, sortOrder, accounts, categories]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = viewMode === 'card' ? filteredTransactions.slice(startIndex, endIndex) : filteredTransactions;

  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
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
          <h1 className="text-3xl dark:text-white">Transaksi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Riwayat semua transaksi Anda</p>
        </div>
        <Button onClick={() => navigate('/transactions/new')} className="gap-2">
          <Plus size={20} />
          Tambah Transaksi
        </Button>
      </div>

      {/* Search Bar and Filter */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Cari transaksi (deskripsi, akun, kategori, nominal)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <Filter size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent className="dark:bg-gray-800 dark:text-white overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="dark:text-white">Filter & Sortir</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Filter Akun</label>
                    <Select value={filterAccount} onValueChange={(v) => handleFilterChange(setFilterAccount, v)}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Akun</SelectItem>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Filter Jenis</label>
                    <Select value={filterType} onValueChange={(v) => handleFilterChange(setFilterType, v)}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
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
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Filter Kategori</label>
                    <Select value={filterCategory} onValueChange={(v) => handleFilterChange(setFilterCategory, v)}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
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
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Urutkan</label>
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={(v: 'date' | 'amount') => setSortBy(v)}>
                        <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
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
                        className="dark:bg-gray-700 dark:border-gray-600"
                      >
                        <ArrowUpDown size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t dark:border-gray-700">
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Tampilan</label>
                    <div className="flex gap-2">
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="gap-2 flex-1"
                      >
                        <List size={16} />
                        List
                      </Button>
                      <Button
                        variant={viewMode === 'card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                        className="gap-2 flex-1"
                      >
                        <LayoutGrid size={16} />
                        Card
                      </Button>
                    </div>
                  </div>

                  {viewMode === 'card' && (
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Per halaman</label>
                      <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                        setItemsPerPage(parseInt(v));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List/Cards */}
      <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
        {paginatedTransactions.map((transaction) => (
          <Card
            key={transaction.id}
            className="hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700"
            onClick={() => navigate(`/transactions/${transaction.id}`)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {transaction.type === 'Masuk' ? (
                      <TrendingUp className="text-green-600" size={20} />
                    ) : (
                      <TrendingDown className="text-red-600" size={20} />
                    )}
                    <Badge variant={transaction.type === 'Masuk' ? 'default' : 'destructive'}>
                      {transaction.type}
                    </Badge>
                  </div>
                  <p className={`text-xl ${transaction.type === 'Masuk' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'Masuk' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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
                    <Badge variant="secondary" className="gap-1">
                      <Paperclip size={12} />
                      {transaction.attachments.length}
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400">{getAccountName(transaction.accountId)}</p>
                
                {transaction.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.description}</p>
                )}
                
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(transaction.date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12 text-center text-gray-500 dark:text-gray-400">
            <p>Tidak ada transaksi ditemukan</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {viewMode === 'card' && totalPages > 1 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="dark:bg-gray-700 dark:border-gray-600"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm dark:text-white">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="dark:bg-gray-700 dark:border-gray-600"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}