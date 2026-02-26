import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, TrendingUp, TrendingDown, Paperclip, ArrowUpDown, List, LayoutGrid, ChevronLeft, ChevronRight, Filter, Search, Loader2, X, Pencil, Trash2 } from 'lucide-react';

export function Transactions() {
  const navigate = useNavigate();
  const { transactions, loading, error, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories, getCategoriesByType } = useCategories();

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

  const transactionCategories = getCategoriesByType('transaction');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const getAccountName = (accountId: string) =>
    accounts.find(a => a.id === accountId)?.name || 'Unknown';

  const getCategoryName = (categoryId: string) =>
    categories.find(c => c.id === categoryId)?.name || 'Other';

  const getCategoryColor = (categoryId: string) =>
    categories.find(c => c.id === categoryId)?.color || '#6b7280';

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        getAccountName(t.accountId).toLowerCase().includes(q) ||
        getCategoryName(t.categoryId).toLowerCase().includes(q) ||
        t.amount.toString().includes(q)
      );
    }
    if (filterAccount !== 'all') result = result.filter(t => t.accountId === filterAccount);
    if (filterType !== 'all') result = result.filter(t => t.type === filterType);
    if (filterCategory !== 'all') result = result.filter(t => t.categoryId === filterCategory);
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
    });
    return result;
  }, [transactions, searchQuery, filterAccount, filterType, filterCategory, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = viewMode === 'card'
    ? filteredTransactions.slice(startIndex, startIndex + itemsPerPage)
    : filteredTransactions;

  const activeFilterCount = [
    filterAccount !== 'all',
    filterType !== 'all',
    filterCategory !== 'all',
  ].filter(Boolean).length;

  const handleFilterChange = (setter: any, value: any) => {
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
    e.stopPropagation(); // Jangan trigger navigate ke detail
    if (!confirm('Delete this transaction?')) return;
    setDeletingId(id);
    const { success, error } = await deleteTransaction(id);
    if (!success) alert(error || 'Failed to delete transaction');
    setDeletingId(null);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Jangan trigger navigate ke detail
    navigate(`/transactions/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">All your transaction history</p>
        </div>
        <Button onClick={() => navigate('/transactions/new')} className="gap-2">
          <Plus size={18} />
          Add Transaction
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by description, account, category, or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border border-border shadow-sm"
          />
        </div>

        <div className="relative" ref={filterRef}>
          <Button variant="outline" className="gap-2 relative" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter size={18} />
            Filter
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
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

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
                  <Select value={filterType} onValueChange={(v) => handleFilterChange(setFilterType, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Masuk">Income</SelectItem>
                      <SelectItem value="Keluar">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
                  <Select value={filterCategory} onValueChange={(v) => handleFilterChange(setFilterCategory, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {transactionCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

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

      {filteredTransactions.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Transaction List/Cards */}
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
            <Card
              key={transaction.id}
              className="hover:shadow-md transition-shadow border border-border bg-card"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left — info utama, klik untuk buka detail */}
                  <div
                    className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => navigate(`/transactions/${transaction.id}`)}
                  >
                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'Masuk' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {transaction.type === 'Masuk'
                        ? <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
                        : <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full border"
                          style={{ borderColor: getCategoryColor(transaction.categoryId), color: getCategoryColor(transaction.categoryId) }}
                        >
                          {getCategoryName(transaction.categoryId)}
                        </span>
                        {transaction.attachments && transaction.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip size={11} />
                            {transaction.attachments.length}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{getAccountName(transaction.accountId)}</p>
                      {transaction.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{transaction.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {new Date(transaction.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Right — amount + action buttons */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className={`text-base font-semibold ${
                      transaction.type === 'Masuk' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'Masuk' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    {/* ✅ Tombol Edit + Delete sejajar horizontal */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleEdit(e, transaction.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title="Edit transaction"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, transaction.id)}
                        disabled={deletingId === transaction.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Delete transaction"
                      >
                        {deletingId === transaction.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
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