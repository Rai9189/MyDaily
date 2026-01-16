import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dummyTransactions, dummyAccounts, dummyCategories } from '../data/dummyData';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, TrendingUp, TrendingDown, Paperclip, ArrowUpDown, List, LayoutGrid, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Search } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction } from '../types';

export function Transactions() {
  const navigate = useNavigate();
  const [transactions] = useState<Transaction[]>(dummyTransactions);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Date filter
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();
  
  // View options
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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

  const getDateRange = () => {
    const today = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: new Date(today.setHours(0, 0, 0, 0)), end: new Date(today.setHours(23, 59, 59, 999)) };
      case 'week':
        return { start: startOfWeek(today, { locale: id }), end: endOfWeek(today, { locale: id }) };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'year':
        return { start: startOfYear(today), end: endOfYear(today) };
      case 'custom':
        return customDateFrom && customDateTo ? { start: customDateFrom, end: customDateTo } : null;
      default:
        return null;
    }
  };

  let filteredTransactions = transactions.filter(t => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDescription = t.description?.toLowerCase().includes(query);
      const matchesAccount = getAccountName(t.accountId).toLowerCase().includes(query);
      const matchesCategory = getCategoryName(t.categoryId).toLowerCase().includes(query);
      const matchesAmount = t.amount.toString().includes(query);
      
      if (!matchesDescription && !matchesAccount && !matchesCategory && !matchesAmount) {
        return false;
      }
    }
    
    if (filterAccount !== 'all' && t.accountId !== filterAccount) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.categoryId !== filterCategory) return false;
    
    // Date filter
    const dateRange = getDateRange();
    if (dateRange) {
      const transactionDate = new Date(t.date);
      if (!isWithinInterval(transactionDate, { start: dateRange.start, end: dateRange.end })) return false;
    }
    
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

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = viewMode === 'card' ? filteredTransactions.slice(startIndex, endIndex) : filteredTransactions;

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

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
                  {/* Date Filter */}
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Filter Waktu</label>
                    <Select value={dateFilter} onValueChange={(v) => handleFilterChange(setDateFilter, v)}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectValue placeholder="Semua Waktu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Waktu</SelectItem>
                        <SelectItem value="today">Hari Ini</SelectItem>
                        <SelectItem value="week">Minggu Ini</SelectItem>
                        <SelectItem value="month">Bulan Ini</SelectItem>
                        <SelectItem value="year">Tahun Ini</SelectItem>
                        <SelectItem value="custom">Range Bebas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range */}
                  {dateFilter === 'custom' && (
                    <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Dari Tanggal</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal dark:bg-gray-700 dark:border-gray-600">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {customDateFrom ? format(customDateFrom, 'PPP', { locale: id }) : 'Pilih tanggal'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={customDateFrom}
                              onSelect={setCustomDateFrom}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Sampai Tanggal</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal dark:bg-gray-700 dark:border-gray-600">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {customDateTo ? format(customDateTo, 'PPP', { locale: id }) : 'Pilih tanggal'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={customDateTo}
                              onSelect={setCustomDateTo}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Filter Akun</label>
                    <Select value={filterAccount} onValueChange={(v) => handleFilterChange(setFilterAccount, v)}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
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

                  {/* View Options */}
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
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
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
                {/* Header */}
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

                {/* Category & Account */}
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
                
                {/* Account */}
                <p className="text-sm text-gray-600 dark:text-gray-400">{getAccountName(transaction.accountId)}</p>
                
                {/* Description */}
                {transaction.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.description}</p>
                )}
                
                {/* Date */}
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