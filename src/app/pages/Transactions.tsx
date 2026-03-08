import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, TrendingUp, TrendingDown, Paperclip, ArrowUpDown, List, LayoutGrid, ChevronLeft, ChevronRight, Filter, Search, Loader2, X, Edit, Trash2, Wallet } from 'lucide-react';

export function Transactions() {
  const navigate = useNavigate();
  const { transactions, loading, error, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories, getCategoriesByType, getCategoriesBySubtype } = useCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // ✅ FIX: Ganti mousedown → click, dan cek apakah target ada di dalam portal Radix
  // Radix Select dropdown dirender di document.body (portal), bukan di dalam filterRef
  // Sehingga mousedown outside akan menutup panel sebelum onValueChange sempat fired
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Jangan tutup jika klik ada di dalam filter panel
      if (filterRef.current && filterRef.current.contains(target)) return;

      // Jangan tutup jika klik ada di dalam Radix portal (dropdown Select)
      // Radix merender konten di [data-radix-popper-content-wrapper] atau [role="listbox"]
      const isInsideRadixPortal =
        (target as Element).closest?.('[data-radix-popper-content-wrapper]') ||
        (target as Element).closest?.('[role="listbox"]') ||
        (target as Element).closest?.('[data-radix-select-content]');

      if (isInsideRadixPortal) return;

      setFilterOpen(false);
    };

    // Gunakan 'click' bukan 'mousedown' agar Radix onValueChange sempat fired
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Unknown';
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Other';
  const getCategoryColor = (id: string) => categories.find(c => c.id === id)?.color || '#6b7280';

  // Filter & sort — kalkulasi langsung tanpa useMemo
  let filteredTransactions = [...transactions];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredTransactions = filteredTransactions.filter(t =>
      t.description?.toLowerCase().includes(q) ||
      getAccountName(t.accountId).toLowerCase().includes(q) ||
      getCategoryName(t.categoryId).toLowerCase().includes(q) ||
      t.amount.toString().includes(q)
    );
  }

  if (filterAccount !== 'all') filteredTransactions = filteredTransactions.filter(t => t.accountId === filterAccount);
  if (filterType !== 'all') filteredTransactions = filteredTransactions.filter(t => t.type === filterType);
  if (filterCategory !== 'all') filteredTransactions = filteredTransactions.filter(t => t.categoryId === filterCategory);

  filteredTransactions.sort((a, b) => {
    if (sortBy === 'date') return sortOrder === 'desc'
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : new Date(a.date).getTime() - new Date(b.date).getTime();
    return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
  });

  // Kategori dropdown di filter panel mengikuti filterType
  let filteredCategoryOptions = getCategoriesByType('transaction');
  if (filterType === 'income') filteredCategoryOptions = getCategoriesBySubtype('income');
  if (filterType === 'expense') filteredCategoryOptions = getCategoriesBySubtype('expense');

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = viewMode === 'card'
    ? filteredTransactions.slice(startIndex, startIndex + itemsPerPage)
    : filteredTransactions;

  const activeFilterCount = [filterAccount !== 'all', filterType !== 'all', filterCategory !== 'all'].filter(Boolean).length;

  const handleTypeFilterChange = (value: string) => {
    setFilterType(value);
    setFilterCategory('all');
    setCurrentPage(1);
  };

  const handleFilterChange = (setter: (v: any) => void, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilterAccount('all');
    setFilterType('all');
    setFilterCategory('all');
    setSortBy('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this transaction?')) return;
    setDeletingId(id);
    const { success, error } = await deleteTransaction(id);
    if (!success) alert(error || 'Failed to delete transaction');
    setDeletingId(null);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/transactions/${id}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
      <p className="text-red-600 dark:text-red-400">Error: {error}</p>
    </div>
  );

  if (accounts.length === 0) {
    return (
      <div className="space-y-6 p-1">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">All your transaction history</p>
        </div>
        <Card className="border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="py-14 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Wallet size={28} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No Account Yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                You need to create at least one account before you can record transactions.
              </p>
            </div>
            <Button onClick={() => navigate('/accounts')} className="gap-2 mt-1">
              <Plus size={16} /> Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">All your transaction history</p>
        </div>
        <Button onClick={() => navigate('/transactions/new')} className="gap-2">
          <Plus size={18} /> Add Transaction
        </Button>
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 text-xs items-center">
          {filterAccount !== 'all' && (
            <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full">
              Account: {accounts.find(a => a.id === filterAccount)?.name}
              <button onClick={() => { setFilterAccount('all'); setCurrentPage(1); }}><X size={11} /></button>
            </span>
          )}
          {filterType !== 'all' && (
            <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full capitalize">
              Type: {filterType}
              <button onClick={() => { setFilterType('all'); setFilterCategory('all'); setCurrentPage(1); }}><X size={11} /></button>
            </span>
          )}
          {filterCategory !== 'all' && (
            <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full">
              Category: {categories.find(c => c.id === filterCategory)?.name}
              <button onClick={() => { setFilterCategory('all'); setCurrentPage(1); }}><X size={11} /></button>
            </span>
          )}
          <button onClick={resetFilters} className="text-muted-foreground hover:text-foreground underline text-xs">
            Clear all
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by description, account, category, or amount..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-10 border border-border shadow-sm"
          />
        </div>

        {/* ✅ FIX: ref dipasang di wrapper div, bukan di dropdown */}
        <div className="relative" ref={filterRef}>
          <Button
            variant="outline"
            className="gap-2 relative"
            onClick={(e) => { e.stopPropagation(); setFilterOpen(prev => !prev); }}
          >
            <Filter size={18} /> Filter
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {filterOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              // ✅ FIX: stopPropagation di panel agar click di dalam tidak bubble ke document
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-foreground">Filter & Sort</span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="text-xs text-primary hover:underline">Reset all</button>
                  )}
                  <button onClick={() => setFilterOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Filter: Account */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account</label>
                  <Select value={filterAccount} onValueChange={(v) => handleFilterChange(setFilterAccount, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter: Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
                  <Select value={filterType} onValueChange={handleTypeFilterChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter: Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Category {filterType !== 'all' && <span className="text-primary normal-case">({filterType})</span>}
                  </label>
                  <Select
                    key={filterType}
                    value={filterCategory}
                    onValueChange={(v) => handleFilterChange(setFilterCategory, v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {filteredCategoryOptions.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort by</label>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(v: 'date' | 'amount') => setSortBy(v)}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                      <ArrowUpDown size={16} />
                    </Button>
                  </div>
                </div>

                {/* View Mode */}
                <div className="border-t border-border pt-3 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">View</label>
                  <div className="flex gap-2">
                    <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} className="gap-2 flex-1">
                      <List size={15} /> List
                    </Button>
                    <Button variant={viewMode === 'card' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('card')} className="gap-2 flex-1">
                      <LayoutGrid size={15} /> Card
                    </Button>
                  </div>
                </div>

                {viewMode === 'card' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per page</label>
                    <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-base font-semibold text-foreground">
        All Transactions{' '}
        <span className="text-muted-foreground font-normal">
          ({filteredTransactions.length}{activeFilterCount > 0 ? ` of ${transactions.length}` : ''})
        </span>
      </h2>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <Card className="border border-border bg-card">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No transactions found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {paginatedTransactions.map((transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow border border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/transactions/${transaction.id}`)}>
                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {transaction.type === 'income'
                        ? <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
                        : <TrendingDown size={16} className="text-red-600 dark:text-red-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full border"
                          style={{ borderColor: getCategoryColor(transaction.categoryId), color: getCategoryColor(transaction.categoryId) }}
                        >
                          {getCategoryName(transaction.categoryId)}
                        </span>
                        {transaction.attachments && transaction.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip size={11} />{transaction.attachments.length}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground mt-1.5">{getAccountName(transaction.accountId)}</p>
                      {transaction.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{transaction.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {new Date(transaction.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className={`text-base font-semibold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => handleEdit(e, transaction.id)}>
                        <Edit size={15} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-red-500 hover:text-white" onClick={(e) => handleDelete(e, transaction.id)} disabled={deletingId === transaction.id}>
                        {deletingId === transaction.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination (card mode only) */}
      {viewMode === 'card' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm text-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}