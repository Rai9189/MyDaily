// src/app/pages/Transactions.tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Plus, TrendingUp, TrendingDown, Paperclip, ArrowUpDown,
  ChevronLeft, ChevronRight, Filter,
  Search, Loader2, X, Edit, Trash2, Wallet,
  LayoutGrid, List,
} from 'lucide-react';

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
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (filterRef.current && filterRef.current.contains(target)) return;
      if (
        target.closest('[data-radix-popper-content-wrapper]') ||
        target.closest('[data-radix-select-viewport]') ||
        target.closest('[data-radix-select-content]') ||
        target.closest('[role="option"]') ||
        target.closest('[role="listbox"]')
      ) return;
      setFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const getAccountName = (id: string | null) => {
    if (!id) return 'Deleted Account';
    return accounts.find(a => a.id === id)?.name ?? 'Deleted Account';
  };
  const isDeletedAccount = (id: string | null) =>
    !id || !accounts.find(a => a.id === id);

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Other';
  const getCategoryColor = (id: string) => categories.find(c => c.id === id)?.color || '#6b7280';

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
      if (sortBy === 'date') return sortOrder === 'desc'
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
    });
    return result;
  }, [transactions, searchQuery, filterAccount, filterType, filterCategory, sortBy, sortOrder]);

  useMemo(() => { setCurrentPage(1); }, [searchQuery, filterAccount, filterType, filterCategory, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all') return 1;
    return Math.ceil(filteredTransactions.length / (itemsPerPage as number));
  }, [filteredTransactions.length, itemsPerPage]);

  const paginatedTransactions = useMemo(() => {
    if (itemsPerPage === 'all') return filteredTransactions;
    const start = (currentPage - 1) * (itemsPerPage as number);
    return filteredTransactions.slice(start, start + (itemsPerPage as number));
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * (itemsPerPage as number);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 3) { pages.push(1, 2, 3, 4, '...', totalPages); }
    else if (currentPage >= totalPages - 2) { pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages); }
    else { pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages); }
    return pages;
  };

  let filteredCategoryOptions = getCategoriesByType('transaction');
  if (filterType === 'income') filteredCategoryOptions = getCategoriesBySubtype('income');
  if (filterType === 'expense') filteredCategoryOptions = getCategoriesBySubtype('expense');

  const activeFilterCount = [filterAccount !== 'all', filterType !== 'all', filterCategory !== 'all'].filter(Boolean).length;

  const handleTypeFilterChange = (value: string) => { setFilterType(value); setFilterCategory('all'); setCurrentPage(1); };
  const handleFilterChange = (setter: (v: any) => void, value: any) => { setter(value); setCurrentPage(1); };

  const resetFilters = () => {
    setFilterAccount('all'); setFilterType('all'); setFilterCategory('all');
    setSortBy('date'); setSortOrder('desc'); setCurrentPage(1);
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg"><p className="text-red-600 dark:text-red-400">Error: {error}</p></div>;

  if (accounts.length === 0 && transactions.length === 0) {
    return (
      <div className="space-y-6 p-1">
        <p className="text-sm font-medium text-foreground/65">All Your Transaction History</p>
        <Card className="border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="py-14 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Wallet size={28} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No Account Yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">You need to create at least one account before you can record transactions.</p>
            </div>
            <Button onClick={() => navigate('/accounts')} className="gap-2 mt-1"><Plus size={16} /> Create Account</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="flex-shrink-0 space-y-3">

        {/* Subheading + Add */}
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-foreground/65">All Your Transaction History</p>
          <Button onClick={() => navigate('/transactions/new')} className="gap-2" disabled={accounts.length === 0}>
            <Plus size={18} /> Add Transaction
          </Button>
        </div>

        {/* Filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 text-xs items-center">
            {filterAccount !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                Account: {accounts.find(a => a.id === filterAccount)?.name}
                <button onClick={() => { setFilterAccount('all'); setCurrentPage(1); }} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            {filterType !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium capitalize shadow-sm">
                Type: {filterType}
                <button onClick={() => { setFilterType('all'); setFilterCategory('all'); setCurrentPage(1); }} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            {filterCategory !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                Category: {categories.find(c => c.id === filterCategory)?.name}
                <button onClick={() => { setFilterCategory('all'); setCurrentPage(1); }} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            <button onClick={resetFilters} className="text-foreground/60 hover:text-foreground underline text-xs font-medium">Clear all</button>
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input placeholder="Search by description, account, category, or amount..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10 border border-border shadow-sm" />
          </div>
          <div className="relative" ref={filterRef}>
            <Button variant="outline" className="gap-2 relative" onClick={() => setFilterOpen(prev => !prev)}>
              <Filter size={18} /> Filter
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
              )}
            </Button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-semibold text-foreground">Filter & Sort</span>
                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && <button onClick={resetFilters} className="text-xs text-primary hover:underline">Reset all</button>}
                    <button onClick={() => setFilterOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
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
                    <Select value={filterType} onValueChange={handleTypeFilterChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Category {filterType !== 'all' && <span className="text-primary normal-case">({filterType})</span>}
                    </label>
                    <Select key={filterType} value={filterCategory} onValueChange={(v) => handleFilterChange(setFilterCategory, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {filteredCategoryOptions.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
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
                      <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}><ArrowUpDown size={16} /></Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Show + view toggle + count */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-foreground/65">Show:</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden bg-muted/40 p-0.5 gap-0.5">
            {([5, 10, 20, 'all'] as (number | 'all')[]).map((num) => (
              <button key={num} onClick={() => { setItemsPerPage(num); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${itemsPerPage === num ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground hover:bg-background'}`}>
                {num === 'all' ? 'All' : num}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-border overflow-hidden bg-muted/40 p-0.5 gap-0.5 ml-1">
            <button onClick={() => setViewMode('list')} title="List view"
              className={`p-1.5 rounded-md transition-all duration-150 ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground hover:bg-background'}`}>
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('card')} title="Card view"
              className={`p-1.5 rounded-md transition-all duration-150 ${viewMode === 'card' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground hover:bg-background'}`}>
              <LayoutGrid size={16} />
            </button>
          </div>
          <span className="text-sm font-medium text-foreground/65 ml-auto">
            {itemsPerPage === 'all' ? `Showing all ${filteredTransactions.length} transactions` : `Page ${currentPage} of ${totalPages} (${filteredTransactions.length} total)`}
          </span>
        </div>

        <h2 className="text-base font-semibold text-foreground">
          All Transactions <span className="text-foreground/50 font-normal">({filteredTransactions.length}{activeFilterCount > 0 ? ` of ${transactions.length}` : ''})</span>
        </h2>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {filteredTransactions.length === 0 ? (
          <Card className="border border-border bg-white dark:bg-card shadow-sm">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (

          /* ── LIST / TABLE VIEW ── */
          <div className="rounded-xl overflow-hidden w-full bg-white dark:bg-card border-2 border-slate-300 dark:border-border shadow-[0_2px_12px_rgba(0,0,0,0.10)] dark:shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 dark:divide-border">
                <thead className="bg-slate-100 dark:bg-muted/60">
                  <tr>
                    <th className="pl-4 pr-2 py-3 w-12" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Attachments</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-card divide-y divide-slate-100 dark:divide-border/50">
                  {paginatedTransactions.map((transaction) => (
                    <tr key={transaction.id}
                      className="hover:bg-slate-50 dark:hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/transactions/${transaction.id}`)}>

                      {/* Type icon */}
                      <td className="pl-4 pr-2 py-5 whitespace-nowrap">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${transaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                          {transaction.type === 'income'
                            ? <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
                            : <TrendingDown size={16} className="text-red-600 dark:text-red-400" />}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-5 whitespace-nowrap">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full border"
                          style={{ borderColor: getCategoryColor(transaction.categoryId), color: getCategoryColor(transaction.categoryId) }}>
                          {getCategoryName(transaction.categoryId)}
                        </span>
                      </td>

                      {/* Account */}
                      <td className="px-4 py-5 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${isDeletedAccount(transaction.accountId) ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                          {getAccountName(transaction.accountId)}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-5">
                        <span className="text-sm text-slate-400 dark:text-foreground/55 truncate max-w-[180px] block">
                          {transaction.description || '—'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-5 whitespace-nowrap">
                        <span className="text-sm text-slate-500 dark:text-foreground/65">
                          {new Date(transaction.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      {/* Attachments */}
                      <td className="px-4 py-5 whitespace-nowrap">
                        {transaction.attachments && transaction.attachments.length > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Paperclip size={11} /> {transaction.attachments.length}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-5 whitespace-nowrap text-right">
                        <span className={`text-sm font-bold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-5 whitespace-nowrap text-right pr-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-foreground dark:text-muted-foreground" onClick={(e) => handleEdit(e, transaction.id)}><Edit size={15} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-red-500 hover:text-white dark:text-muted-foreground" onClick={(e) => handleDelete(e, transaction.id)} disabled={deletingId === transaction.id}>
                            {deletingId === transaction.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        ) : (
          /* ── CARD VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedTransactions.map((transaction) => (
              <Card key={transaction.id}
                className="hover:shadow-lg transition-shadow border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-card cursor-pointer"
                onClick={() => navigate(`/transactions/${transaction.id}`)}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${transaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {transaction.type === 'income' ? <TrendingUp size={16} className="text-green-600 dark:text-green-400" /> : <TrendingDown size={16} className="text-red-600 dark:text-red-400" />}
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={{ borderColor: getCategoryColor(transaction.categoryId), color: getCategoryColor(transaction.categoryId) }}>
                        {getCategoryName(transaction.categoryId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => handleEdit(e, transaction.id)}><Edit size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-red-500 hover:text-white" onClick={(e) => handleDelete(e, transaction.id)} disabled={deletingId === transaction.id}>
                        {deletingId === transaction.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Account</span>
                      <span className={`text-sm font-medium truncate max-w-[60%] text-right ${isDeletedAccount(transaction.accountId) ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                        {getAccountName(transaction.accountId)}
                      </span>
                    </div>
                    {transaction.description && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Note</span>
                        <span className="text-xs text-slate-500 truncate max-w-[60%] text-right">{transaction.description}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Date</span>
                      <span className="text-xs text-slate-600">{new Date(transaction.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {transaction.attachments && transaction.attachments.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Attachments</span>
                        <span className="flex items-center gap-1 text-xs text-slate-400"><Paperclip size={11} />{transaction.attachments.length}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Amount</span>
                        <span className={`text-base font-bold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── PAGINATION ── */}
      {itemsPerPage !== 'all' && totalPages > 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-card border-t-2 border-slate-200 dark:border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] py-3 px-6">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm font-medium text-foreground/65">
              Showing {startIndex + 1}–{Math.min(startIndex + (itemsPerPage as number), filteredTransactions.length)} of {filteredTransactions.length}
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="gap-1"><ChevronLeft size={16} /> Previous</Button>
              <div className="flex gap-1">
                {getPageNumbers().map((page, index) =>
                  page === '...' ? <span key={`e-${index}`} className="px-2 py-1.5 text-sm text-foreground/50">...</span> :
                  <button key={page} onClick={() => setCurrentPage(page as number)}
                    className={`min-w-[36px] px-2 py-1.5 text-sm rounded-md transition-colors font-medium ${currentPage === page ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground/70 hover:bg-muted'}`}>{page}</button>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="gap-1">Next <ChevronRight size={16} /></Button>
            </div>
          </div>
        </div>
      )}
      {itemsPerPage !== 'all' && totalPages > 1 && <div className="h-16 flex-shrink-0" />}
    </div>
  );
}