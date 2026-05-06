// src/app/pages/Transactions.tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { stripHtml } from '../components/RichTextEditor';
import { useViewPreferences } from '../hooks/useViewPreferences';
import { DateRangeFilter, defaultDateRange, type DateRangeValue } from '../components/DateRangeFilter';
import { format } from 'date-fns';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Plus, TrendingUp, TrendingDown, Paperclip, ArrowUpDown,
  ChevronLeft, ChevronRight, Filter, CalendarDays,
  Search, X, Edit, Trash2, Wallet, ArrowLeftRight,
  LayoutGrid, List,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListPageSkeleton } from '../components/Skeletons';
import { ConfirmDialog } from '../components/ConfirmDialog';

type PopupType = 'income' | 'expense' | 'transfer' | null;

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(2)}jt`;
  if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(1)}rb`;
  return `Rp ${n.toLocaleString('id-ID')}`;
};

function SummaryPopup({
  type, amount, txCount, percentage, onClose, onViewAll,
}: {
  type: PopupType;
  amount: number;
  txCount: number;
  percentage?: string;
  onClose: () => void;
  onViewAll: () => void;
}) {
  if (!type) return null;

  const config = {
    income: {
      label: 'Income',
      icon: <TrendingUp size={18} />,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-zinc-900',
      border: 'border-green-200 dark:border-green-700',
      iconBg: 'bg-green-100 dark:bg-green-900/60',
      innerBg: 'bg-white dark:bg-zinc-800',
      btnBg: 'bg-green-100 dark:bg-green-900/60 hover:bg-green-200 dark:hover:bg-green-900',
    },
    expense: {
      label: 'Expense',
      icon: <TrendingDown size={18} />,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-zinc-900',
      border: 'border-red-200 dark:border-red-700',
      iconBg: 'bg-red-100 dark:bg-red-900/60',
      innerBg: 'bg-white dark:bg-zinc-800',
      btnBg: 'bg-red-100 dark:bg-red-900/60 hover:bg-red-200 dark:hover:bg-red-900',
    },
    transfer: {
      label: 'Transfer',
      icon: <ArrowLeftRight size={18} />,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-zinc-900',
      border: 'border-blue-200 dark:border-blue-700',
      iconBg: 'bg-blue-100 dark:bg-blue-900/60',
      innerBg: 'bg-white dark:bg-zinc-800',
      btnBg: 'bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-900',
    },
  };

  const c = config[type];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-72 rounded-2xl border-2 ${c.border} ${c.bg} shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-full ${c.iconBg} flex items-center justify-center ${c.color}`}>
              {c.icon}
            </div>
            <span className={`font-semibold text-base ${c.color}`}>{c.label}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
          <p className={`text-2xl font-bold tracking-tight ${c.color}`}>{fmt(amount)}</p>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-1 ${c.innerBg} rounded-xl px-3 py-2 text-center`}>
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-lg font-bold text-foreground">{txCount}</p>
          </div>
          {percentage && (
            <div className={`flex-1 ${c.innerBg} rounded-xl px-3 py-2 text-center`}>
              <p className="text-xs text-muted-foreground">Portion</p>
              <p className={`text-lg font-bold ${c.color}`}>{percentage}%</p>
            </div>
          )}
        </div>

        <button
          onClick={onViewAll}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${c.btnBg} ${c.color} flex items-center justify-center gap-1.5`}
        >
          View All {c.label} <ChevronRight size={15} />
        </button>
      </div>
    </>
  );
}

export function Transactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions, loading, error, deleteTransaction } = useTransactions();
  const { accounts }                                        = useAccounts();
  const { categories, getCategoriesByType, getCategoriesBySubtype, getEffectiveCategoryName, getEffectiveCategoryColor } = useCategories();

  const { itemsPerPage, setItemsPerPage, viewMode, setViewMode } = useViewPreferences('transactions');

  const [searchQuery, setSearchQuery]         = useState('');
  const [filterAccount, setFilterAccount]     = useState('all');
  const [filterType, setFilterType]           = useState('all');
  const [filterCategory, setFilterCategory]   = useState('all');
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);
  const [dateRange, setDateRange]             = useState<DateRangeValue>(defaultDateRange());
  const [sortBy, setSortBy]                   = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder]             = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage]         = useState(1);
  const [filterOpen, setFilterOpen]           = useState(false);
  const [deleteTarget, setDeleteTarget]       = useState<{ id: string; amount: number; type: string; isTransfer?: boolean } | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [activePopup, setActivePopup]         = useState<PopupType>(null);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    const accountId = params.get('accountId');
    if (!type && !accountId) return;
    if (type && ['income', 'expense', 'transfer'].includes(type)) setFilterType(type);
    if (accountId) setFilterAccount(accountId);
    navigate('/transactions', { replace: true });
  }, [location.search, navigate]);

  const getAccountName   = (id: string | null) =>
    !id ? 'Deleted Account' : accounts.find(a => a.id === id)?.name ?? 'Deleted Account';
  const isDeletedAccount = (id: string | null) => !id || !accounts.find(a => a.id === id);
  const getCategoryName  = (id: string, subId?: string | null) => getEffectiveCategoryName(id, subId);
  const getCategoryColor = (id: string, subId?: string | null) => getEffectiveCategoryColor(id, subId);

  const getTransferLabel = (t: any) => {
    if (t.toAccountId) {
      return `Transfer → ${getAccountName(t.toAccountId)}`;
    } else {
      const pair = transactions.find(tx => tx.transferPairId === t.transferPairId && tx.id !== t.id);
      return `Transfer ← ${pair ? getAccountName(pair.accountId) : 'Unknown'}`;
    }
  };

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        getAccountName(t.accountId).toLowerCase().includes(q) ||
        (t.type === 'transfer' ? getTransferLabel(t).toLowerCase().includes(q) : getCategoryName(t.categoryId, t.subcategoryId).toLowerCase().includes(q)) ||
        t.amount.toString().includes(q)
      );
    }
    if (filterAccount  !== 'all') result = result.filter(t => t.accountId  === filterAccount);
    if (filterType     !== 'all') result = result.filter(t => t.type       === filterType);
    if (filterCategory !== 'all') result = result.filter(t =>
      t.type !== 'transfer' && (t.categoryId === filterCategory || t.subcategoryId === filterCategory)
    );
    if (dateRangeEnabled) result = result.filter(t => {
      const d = new Date(t.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return sortOrder === 'desc' ? dateDiff : -dateDiff;
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortOrder === 'desc' ? bCreated - aCreated : aCreated - bCreated;
      }
      return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
    });
    return result;
  }, [transactions, searchQuery, filterAccount, filterType, filterCategory, sortBy, sortOrder, dateRangeEnabled, dateRange]);

  useMemo(() => { setCurrentPage(1); }, [searchQuery, filterAccount, filterType, filterCategory, dateRangeEnabled, dateRange, itemsPerPage]);

  const summaryIncome   = useMemo(() => filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),   [filteredTransactions]);
  const summaryExpense  = useMemo(() => filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),  [filteredTransactions]);
  const summaryTransfer = useMemo(() => filteredTransactions.filter(t => t.type === 'transfer' && t.toAccountId).reduce((s, t) => s + t.amount, 0), [filteredTransactions]);

  const summaryIncomeTxCount   = useMemo(() => filteredTransactions.filter(t => t.type === 'income').length,                    [filteredTransactions]);
  const summaryExpenseTxCount  = useMemo(() => filteredTransactions.filter(t => t.type === 'expense').length,                   [filteredTransactions]);
  const summaryTransferTxCount = useMemo(() => filteredTransactions.filter(t => t.type === 'transfer' && t.toAccountId).length, [filteredTransactions]);

  const summaryIncomePercent  = summaryIncome + summaryExpense > 0 ? ((summaryIncome  / (summaryIncome + summaryExpense)) * 100).toFixed(0) : undefined;
  const summaryExpensePercent = summaryIncome + summaryExpense > 0 ? ((summaryExpense / (summaryIncome + summaryExpense)) * 100).toFixed(0) : undefined;

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
    else if (currentPage <= 3)              { pages.push(1, 2, 3, 4, '...', totalPages); }
    else if (currentPage >= totalPages - 2) { pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages); }
    else { pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages); }
    return pages;
  };

  const filteredCategoryOptions = filterType === 'income'  ? getCategoriesBySubtype('income')
                                 : filterType === 'expense' ? getCategoriesBySubtype('expense')
                                 : getCategoriesByType('transaction');

  const activeFilterCount = [filterAccount !== 'all', filterType !== 'all', filterCategory !== 'all', dateRangeEnabled].filter(Boolean).length;

  const resetFilters = () => {
    setFilterAccount('all'); setFilterType('all'); setFilterCategory('all');
    setDateRangeEnabled(false); setDateRange(defaultDateRange());
    setSortBy('date'); setSortOrder('desc'); setCurrentPage(1);
  };

  const handleDeleteRequest = (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    setDeleteTarget({ id: t.id, amount: t.amount, type: t.type, isTransfer: t.type === 'transfer' });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { success, error } = await deleteTransaction(deleteTarget.id);
    if (success) toast.success(deleteTarget.isTransfer ? 'Transfer deleted (both sides)' : 'Transaction deleted');
    else toast.error(error || 'Failed to delete');
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleEdit = (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    if (t.type === 'transfer' && !t.toAccountId) {
      const outTx = transactions.find(tx => tx.transferPairId === t.transferPairId && tx.toAccountId);
      if (outTx) { navigate(`/transactions/${outTx.id}`); return; }
    }
    navigate(`/transactions/${t.id}`);
  };

  if (loading) return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <ListPageSkeleton rows={5} />
      </div>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
      <p className="text-red-600 dark:text-red-400">Error: {error}</p>
    </div>
  );

  if (accounts.length === 0 && transactions.length === 0) return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground/65">All Your Transaction History</p>
      <Card className="border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
        <CardContent className="py-14 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Wallet size={28} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">No Account Yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Create at least one account before recording transactions.
            </p>
          </div>
          <Button onClick={() => navigate('/accounts')} className="gap-2 mt-1">
            <Plus size={16} /> Create Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const getTypeIcon = (t: any) => {
    if (t.type === 'transfer') {
      return t.toAccountId
        ? <ArrowLeftRight size={15} className="text-blue-600 dark:text-blue-400" />
        : <ArrowLeftRight size={15} className="text-blue-400 dark:text-blue-300" />;
    }
    return t.type === 'income'
      ? <TrendingUp size={15} className="text-green-600 dark:text-green-400" />
      : <TrendingDown size={15} className="text-red-600 dark:text-red-400" />;
  };

  const getTypeBg = (t: any) => {
    if (t.type === 'transfer') return 'bg-blue-100 dark:bg-blue-900/30';
    return t.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30';
  };

  const getAmountColor = (t: any) => {
    if (t.type === 'transfer') return t.toAccountId ? 'text-blue-600 dark:text-blue-400' : 'text-blue-400 dark:text-blue-300';
    return t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getAmountPrefix = (t: any) => {
    if (t.type === 'transfer') return t.toAccountId ? '↔' : '+';
    return t.type === 'income' ? '+' : '-';
  };

  const getCardBorder = (t: any) => {
    if (t.type === 'transfer') return 'border-blue-200 dark:border-blue-900/50';
    return t.type === 'income' ? 'border-green-200 dark:border-green-900/50' : 'border-red-200 dark:border-red-900/50';
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.isTransfer ? 'Delete Transfer?' : 'Delete Transaction'}
        description={
          deleteTarget?.isTransfer
            ? `Delete this transfer of ${deleteTarget ? fmt(deleteTarget.amount) : ''}? Both the outgoing and incoming records will be deleted.`
            : `Delete this ${deleteTarget?.type} transaction of ${deleteTarget ? fmt(deleteTarget.amount) : ''}?`
        }
        confirmLabel="Delete"
        variant="danger"
        icon={<Trash2 size={20} />}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Popup detail ── */}
      {activePopup === 'income' && (
        <SummaryPopup
          type="income"
          amount={summaryIncome}
          txCount={summaryIncomeTxCount}
          percentage={summaryIncomePercent}
          onClose={() => setActivePopup(null)}
          onViewAll={() => { setActivePopup(null); setFilterType('income'); setCurrentPage(1); }}
        />
      )}
      {activePopup === 'expense' && (
        <SummaryPopup
          type="expense"
          amount={summaryExpense}
          txCount={summaryExpenseTxCount}
          percentage={summaryExpensePercent}
          onClose={() => setActivePopup(null)}
          onViewAll={() => { setActivePopup(null); setFilterType('expense'); setCurrentPage(1); }}
        />
      )}
      {activePopup === 'transfer' && (
        <SummaryPopup
          type="transfer"
          amount={summaryTransfer}
          txCount={summaryTransferTxCount}
          onClose={() => setActivePopup(null)}
          onViewAll={() => { setActivePopup(null); setFilterType('transfer'); setCurrentPage(1); }}
        />
      )}

      {/* ── HEADER ── */}
      <div className="flex-shrink-0 space-y-2">

        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-foreground/65">All Your Transaction History</p>
          <Button onClick={() => navigate('/transactions/new')} className="hidden md:flex gap-2" disabled={accounts.length === 0}>
            <Plus size={18} /> Add Transaction
          </Button>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 text-xs items-center">
            {filterAccount !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                Account: {accounts.find(a => a.id === filterAccount)?.name}
                <button onClick={() => { setFilterAccount('all'); setCurrentPage(1); }}
                  className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            {filterType !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium capitalize shadow-sm">
                Type: {filterType}
                <button onClick={() => { setFilterType('all'); setFilterCategory('all'); setCurrentPage(1); }}
                  className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            {filterCategory !== 'all' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                Category: {categories.find(c => c.id === filterCategory)?.name}
                <button onClick={() => { setFilterCategory('all'); setCurrentPage(1); }}
                  className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            {dateRangeEnabled && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full font-medium shadow-sm">
                <CalendarDays size={11} />
                {format(dateRange.start, 'd MMM')} – {format(dateRange.end, 'd MMM yyyy')}
                <button onClick={() => { setDateRangeEnabled(false); setCurrentPage(1); }}
                  className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"><X size={11} /></button>
              </span>
            )}
            <button onClick={resetFilters} className="text-foreground/60 hover:text-foreground underline text-xs font-medium">
              Clear All
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10 border border-border shadow-sm"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <Button variant="outline" className="gap-2 relative" onClick={() => setFilterOpen(prev => !prev)}>
              <Filter size={18} />
              <span className="hidden sm:inline">Filter & Sort</span>
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
                      <button onClick={resetFilters} className="text-xs text-primary hover:underline">Reset All</button>
                    )}
                    <button onClick={() => setFilterOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account</label>
                    <Select value={filterAccount} onValueChange={(v) => { setFilterAccount(v); setCurrentPage(1); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
                    <div className="flex gap-2">
                      {([
                        { value: 'all',      label: 'All'        },
                        { value: 'income',   label: '↑ Income'   },
                        { value: 'expense',  label: '↓ Expense'  },
                        { value: 'transfer', label: '↔ Transfer' },
                      ] as const).map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => { setFilterType(opt.value); setFilterCategory('all'); setCurrentPage(1); }}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            filterType === opt.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {filterType !== 'transfer' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Category{filterType !== 'all' && <span className="ml-1 text-primary normal-case capitalize">({filterType})</span>}
                      </label>
                      <Select key={filterType} value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories">
                            {filterCategory === 'all' ? 'All Categories' : (() => {
                              const cat = categories.find(c => c.id === filterCategory);
                              if (!cat) return 'All Categories';
                              if (cat.parentId) {
                                const parent = categories.find(c => c.id === cat.parentId);
                                return parent ? `${parent.name} / ${cat.name}` : cat.name;
                              }
                              return cat.name;
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {filteredCategoryOptions.filter(cat => !cat.parentId).map(parent => (
                            <div key={parent.id}>
                              <SelectItem value={parent.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: parent.color }} />
                                  <span className="font-medium">{parent.name}</span>
                                </div>
                              </SelectItem>
                              {filteredCategoryOptions.filter(c => c.parentId === parent.id).map(sub => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  <div className="flex items-center gap-2 pl-4">
                                    <span className="text-muted-foreground text-xs">└</span>
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color || parent.color }} />
                                    <span className="text-sm">{sub.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Range</label>
                      <button
                        type="button"
                        onClick={() => { setDateRangeEnabled(e => !e); setCurrentPage(1); }}
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                          dateRangeEnabled
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {dateRangeEnabled ? 'On' : 'Off'}
                      </button>
                    </div>
                    {dateRangeEnabled && (
                      <DateRangeFilter value={dateRange} onChange={(v) => { setDateRange(v); setCurrentPage(1); }} />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort By</label>
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={(v: 'date' | 'amount') => setSortBy(v)}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="amount">Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                        <ArrowUpDown size={15} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-foreground/65">Show:</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden bg-muted/40 p-0.5 gap-0.5">
            {([5, 10, 20, 'all'] as (number | 'all')[]).map((num) => (
              <button key={num} onClick={() => { setItemsPerPage(num); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                  itemsPerPage === num
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/60 hover:text-foreground hover:bg-background'
                }`}>
                {num === 'all' ? 'All' : num}
              </button>
            ))}
          </div>

          <div className="hidden md:inline-flex rounded-lg border border-border overflow-hidden bg-muted/40 p-0.5 gap-0.5">
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
            {itemsPerPage === 'all'
              ? `Showing All ${filteredTransactions.length} Transactions`
              : `Page ${currentPage} Of ${totalPages} (${filteredTransactions.length} Total)`
            }
          </span>
        </div>

        {/* ── Summary bar ── */}
        {filteredTransactions.length > 0 && (
          <div className={`grid gap-2 ${summaryTransfer > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div
              className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-900/40 min-w-0 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => setActivePopup('income')}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={12} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs text-green-700 dark:text-green-400 font-medium truncate">Income</p>
              </div>
              <p className="text-sm font-bold text-green-700 dark:text-green-300 truncate hidden sm:block">{fmt(summaryIncome)}</p>
              <p className="text-base font-bold text-green-700 dark:text-green-300 truncate sm:hidden">{fmtShort(summaryIncome)}</p>
            </div>

            <div
              className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-900/40 min-w-0 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => setActivePopup('expense')}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <TrendingDown size={12} className="text-red-600 dark:text-red-400" />
                </div>
                <p className="text-xs text-red-700 dark:text-red-400 font-medium truncate">Expense</p>
              </div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300 truncate hidden sm:block">{fmt(summaryExpense)}</p>
              <p className="text-base font-bold text-red-700 dark:text-red-300 truncate sm:hidden">{fmtShort(summaryExpense)}</p>
            </div>

            {summaryTransfer > 0 && (
              <div
                className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-900/40 min-w-0 cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setActivePopup('transfer')}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <ArrowLeftRight size={12} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium truncate">Transfer</p>
                </div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate hidden sm:block">{fmt(summaryTransfer)}</p>
                <p className="text-base font-bold text-blue-700 dark:text-blue-300 truncate sm:hidden">{fmtShort(summaryTransfer)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
        {filteredTransactions.length === 0 ? (
          <Card className="border-2 border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No Transactions Found</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
            </CardContent>
          </Card>

        ) : viewMode === 'list' ? (
          <div className="rounded-xl overflow-hidden w-full bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-100 dark:divide-border">
                <thead className="bg-slate-100 dark:bg-muted/60">
                  <tr>
                    <th className="pl-4 pr-2 py-3 w-12" />
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Category / Transfer</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Account</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-foreground/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-border/50">
                  {paginatedTransactions.map((t) => (
                    <tr key={t.id}
                      className="group hover:bg-slate-50 dark:hover:bg-muted/40 cursor-pointer transition-colors relative"
                      onClick={() => navigate(`/transactions/${t.id}`)}>
                      <td className={`pl-0 pr-2 whitespace-nowrap ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`}>
                        <div className="flex items-center gap-0">
                          <div className={`w-1 self-stretch rounded-r-full mr-3 ${
                            t.type === 'income' ? 'bg-green-400 dark:bg-green-600' :
                            t.type === 'transfer' ? 'bg-blue-400 dark:bg-blue-600' :
                            'bg-red-400 dark:bg-red-600'
                          }`} />
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getTypeBg(t)}`}>
                            {getTypeIcon(t)}
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 text-center ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`}>
                        <div className="relative inline-block">
                          {t.type === 'transfer' ? (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400 inline-block">
                              {getTransferLabel(t)}
                            </span>
                          ) : (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full border inline-block cursor-default"
                              style={{ borderColor: getCategoryColor(t.categoryId, t.subcategoryId), color: getCategoryColor(t.categoryId, t.subcategoryId) }}>
                              {getCategoryName(t.categoryId, t.subcategoryId)}
                            </span>
                          )}
                          {t.description && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block pointer-events-none">
                              <div className="bg-foreground text-background text-xs rounded-lg px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate shadow-lg">
                                {stripHtml(t.description)}
                              </div>
                              <div className="w-2 h-2 bg-foreground rotate-45 mx-auto -mt-1" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 whitespace-nowrap text-center ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`}>
                        <span className={`text-sm font-medium ${isDeletedAccount(t.accountId) ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                          {getAccountName(t.accountId)}
                        </span>
                      </td>
                      <td className={`px-4 whitespace-nowrap text-center ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`}>
                        <span className="text-sm text-slate-500 dark:text-foreground/65">
                          {new Date(t.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className={`px-4 whitespace-nowrap text-center ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`}>
                        <span className={`text-sm font-bold ${getAmountColor(t)}`}>
                          {getAmountPrefix(t)}{fmt(t.amount)}
                        </span>
                      </td>
                      <td className={`px-4 whitespace-nowrap text-center ${itemsPerPage === 5 ? 'py-2' : 'py-4'}`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-foreground"
                            onClick={(e) => handleEdit(e, t)}><Edit size={14} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-red-500 hover:text-white"
                            onClick={(e) => handleDeleteRequest(e, t)}>
                            <Trash2 size={14} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedTransactions.map((t) => (
              <Card key={t.id}
                className={`hover:shadow-lg transition-all bg-white dark:bg-card cursor-pointer border-2 ${getCardBorder(t)}`}
                onClick={() => navigate(`/transactions/${t.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeBg(t)}`}>
                        {getTypeIcon(t)}
                      </div>
                      {t.type === 'transfer' ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">
                          {getTransferLabel(t)}
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
                          style={{ borderColor: getCategoryColor(t.categoryId, t.subcategoryId), color: getCategoryColor(t.categoryId, t.subcategoryId) }}>
                          {getCategoryName(t.categoryId, t.subcategoryId)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-foreground"
                        onClick={(e) => handleEdit(e, t)}><Edit size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-red-500 hover:text-white"
                        onClick={(e) => handleDeleteRequest(e, t)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  <p className={`text-xl font-bold mb-3 ${getAmountColor(t)}`}>
                    {getAmountPrefix(t)}{fmt(t.amount)}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Account</span>
                      <span className={`font-medium truncate max-w-[60%] text-right ${isDeletedAccount(t.accountId) ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                        {getAccountName(t.accountId)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Date</span>
                      <span className="text-foreground/70">
                        {new Date(t.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {t.description && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Note</span>
                        <span className="text-foreground/70 truncate max-w-[60%] text-right">{stripHtml(t.description)}</span>
                      </div>
                    )}
                    {t.attachments && t.attachments.length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Attachments</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Paperclip size={11} /> {t.attachments.length}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── PAGINATION ── */}
      {itemsPerPage !== 'all' && totalPages > 1 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 bg-white dark:bg-card border-t-2 border-slate-200 dark:border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] py-3 px-6">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm font-medium text-foreground/65">
              Showing {startIndex + 1}–{Math.min(startIndex + (itemsPerPage as number), filteredTransactions.length)} of {filteredTransactions.length}
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="gap-1">
                <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex gap-1">
                {getPageNumbers().map((page, index) =>
                  page === '...' ? (
                    <span key={`e-${index}`} className="px-2 py-1.5 text-sm text-foreground/50">...</span>
                  ) : (
                    <button key={page} onClick={() => setCurrentPage(page as number)}
                      className={`min-w-[36px] px-2 py-1.5 text-sm rounded-md transition-colors font-medium ${
                        currentPage === page ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground/70 hover:bg-muted'
                      }`}>{page}</button>
                  )
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="gap-1">
                <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
      {itemsPerPage !== 'all' && totalPages > 1 && <div className="h-16 flex-shrink-0" />}
    </div>
  );
}