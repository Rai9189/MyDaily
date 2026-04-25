// src/app/pages/Dashboard.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccounts } from '../context/AccountContext';
import { useTransactions } from '../context/TransactionContext';
import { useTasks } from '../context/TaskContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  AlertCircle, Wallet, TrendingUp, TrendingDown,
  CalendarX, CheckCircle2, Clock, CalendarClock, ChevronRight, ChevronDown, BarChart2,
  Info,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { isWithinInterval, isAfter, isBefore, addDays, format } from 'date-fns';
import { DateRangeFilter, defaultDateRange, type DateRangeValue } from '../components/DateRangeFilter';
import { DashboardSkeleton } from '../components/Skeletons';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const inRange = (dateStr: string, start: Date, end: Date) =>
  isWithinInterval(new Date(dateStr), { start, end });

type PieMode = 'income' | 'expense' | 'both';

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{fmt(payload[0].value)}</p>
    </div>
  );
}

// ── Empty state component ──────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Info size={18} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">Tidak ada data</p>
      <p className="text-xs text-muted-foreground text-center leading-relaxed px-4">
        {label}
      </p>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { accounts, loading: aL } = useAccounts();
  const { transactions, loading: tL } = useTransactions();
  const { tasks, loading: tkL } = useTasks();
  const { categories } = useCategories();

  const [range, setRange] = useState<DateRangeValue>(defaultDateRange());
  const [pieMode, setPieMode] = useState<PieMode>('both');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const filteredTx = useMemo(
    () => transactions.filter(t =>
      inRange(t.date, range.start, range.end) &&
      (selectedAccountId === 'all' || t.accountId === selectedAccountId)
    ),
    [transactions, range, selectedAccountId],
  );

  const totalBalance = useMemo(() => {
    if (selectedAccountId === 'all') return accounts.reduce((s, a) => s + a.balance, 0);
    return accounts.find(a => a.id === selectedAccountId)?.balance ?? 0;
  }, [accounts, selectedAccountId]);

  const income  = useMemo(() => filteredTx.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0), [filteredTx]);
  const expense = useMemo(() => filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filteredTx]);
  const net     = income - expense;

  const incomeTxCount  = useMemo(() => filteredTx.filter(t => t.type === 'income').length,  [filteredTx]);
  const expenseTxCount = useMemo(() => filteredTx.filter(t => t.type === 'expense').length, [filteredTx]);

  const pieData = useMemo(() => {
    if (pieMode === 'both') {
      const d = [];
      if (income  > 0) d.push({ name: 'Income',  value: income,  color: '#16a34a' });
      if (expense > 0) d.push({ name: 'Expense', value: expense, color: '#dc2626' });
      return d;
    }
    if (pieMode === 'income') {
      return filteredTx
        .filter(t => t.type === 'income')
        .reduce((acc, t) => {
          const cat = categories.find(c => c.id === t.categoryId);
          const name = cat?.name || 'Other';
          const color = cat?.color || '#16a34a';
          const existing = acc.find(i => i.name === name);
          if (existing) existing.value += t.amount;
          else acc.push({ name, value: t.amount, color });
          return acc;
        }, [] as { name: string; value: number; color: string }[])
        .sort((a, b) => b.value - a.value);
    }
    return filteredTx
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const cat = categories.find(c => c.id === t.categoryId);
        const name = cat?.name || 'Other';
        const color = cat?.color || '#6b7280';
        const existing = acc.find(i => i.name === name);
        if (existing) existing.value += t.amount;
        else acc.push({ name, value: t.amount, color });
        return acc;
      }, [] as { name: string; value: number; color: string }[])
      .sort((a, b) => b.value - a.value);
  }, [pieMode, filteredTx, categories, income, expense]);

  const pieTotal = useMemo(() => pieData.reduce((s, i) => s + i.value, 0), [pieData]);

  const overdueTasks   = useMemo(() => tasks.filter(t => t.status === 'overdue'  && !t.completed), [tasks]);
  const urgentTasks    = useMemo(() => tasks.filter(t => t.status === 'urgent'   && !t.completed), [tasks]);
  const activeTasks    = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t =>  t.completed), [tasks]);

  const upcomingTasks = useMemo(() => {
    const today = new Date();
    const horizon = addDays(today, 14);
    return tasks
      .filter(t => {
        if (t.completed) return false;
        const d = new Date(t.deadline);
        return isWithinInterval(d, { start: range.start, end: range.end }) ||
               (isAfter(d, today) && isBefore(d, horizon));
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 8);
  }, [tasks, range]);

  const dotColor = (status: string) => {
    switch (status) {
      case 'overdue':  return 'bg-red-500';
      case 'urgent':   return 'bg-orange-500';
      case 'upcoming': return 'bg-amber-400';
      default:         return 'bg-blue-400';
    }
  };

  // Range label for empty state messages
  const rangeLabel = useMemo(() => {
    try {
      return `${format(range.start, 'd MMM')} – ${format(range.end, 'd MMM yyyy')}`;
    } catch {
      return 'periode ini';
    }
  }, [range]);

  if (aL || tL || tkL) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-3 pb-6">

          {/* ── Filter bar ── */}
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setAccountDropdownOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-card border border-border rounded-lg text-xs font-medium shadow-sm hover:bg-muted transition-colors"
              >
                <Wallet size={12} className="text-primary flex-shrink-0" />
                <span className="text-foreground max-w-[80px] truncate">
                  {selectedAccountId === 'all'
                    ? 'All Accounts'
                    : (accounts.find(a => a.id === selectedAccountId)?.name ?? 'Account')}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-muted-foreground transition-transform flex-shrink-0 ${accountDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {accountDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAccountDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => { setSelectedAccountId('all'); setAccountDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-muted ${selectedAccountId === 'all' ? 'text-primary' : 'text-foreground'}`}
                    >
                      All Accounts
                    </button>
                    {accounts.map(acc => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => { setSelectedAccountId(acc.id); setAccountDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-muted ${selectedAccountId === acc.id ? 'text-primary font-semibold' : 'text-foreground font-medium'}`}
                      >
                        <span>{acc.name}</span>
                        <span className="block text-muted-foreground font-normal">{acc.type} · {fmt(acc.balance)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <DateRangeFilter value={range} onChange={setRange} />
            </div>
          </div>

          {/* ── Balance Card ── */}
          <Card className="bg-primary text-primary-foreground border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 opacity-80">
                    <Wallet size={12} className="flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest truncate">
                      {selectedAccountId === 'all'
                        ? 'Total Balance'
                        : (accounts.find(a => a.id === selectedAccountId)?.name ?? 'Balance')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight truncate">{fmt(totalBalance)}</p>
                  <p className="text-[11px] opacity-60 mt-0.5">
                    {selectedAccountId === 'all'
                      ? `${accounts.length} Account${accounts.length !== 1 ? 's' : ''}`
                      : (accounts.find(a => a.id === selectedAccountId)?.type ?? '')}
                  </p>
                </div>
                <div className="opacity-10 flex-shrink-0">
                  <Wallet size={40} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Income + Expense ── */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Income — tap to go to filtered transaction list */}
            <Card
              className="bg-white dark:bg-card border-2 border-green-200 dark:border-green-900/50 shadow-sm rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate('/transactions?type=income')}
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={11} />
                  </div>
                  <span className="text-xs font-semibold">Income</span>
                  <span className="ml-auto text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {income + expense > 0 ? `${((income / (income + expense)) * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
                <p className="text-base font-bold text-foreground leading-tight truncate">{fmt(income)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                  {incomeTxCount} transaksi <ChevronRight size={10} className="opacity-50" />
                </p>
              </CardContent>
            </Card>

            {/* Expense — tap to go to filtered transaction list */}
            <Card
              className="bg-white dark:bg-card border-2 border-red-200 dark:border-red-900/50 shadow-sm rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate('/transactions?type=expense')}
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <TrendingDown size={11} />
                  </div>
                  <span className="text-xs font-semibold">Expenses</span>
                  <span className="ml-auto text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {income + expense > 0 ? `${((expense / (income + expense)) * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
                <p className="text-base font-bold text-foreground leading-tight truncate">{fmt(expense)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                  {expenseTxCount} transaksi <ChevronRight size={10} className="opacity-50" />
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Transaction Chart ── */}
          <Card className="bg-white dark:bg-card border-2 border-blue-200 dark:border-blue-900/50 shadow-sm rounded-xl">
            <CardHeader className="pb-0 pt-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <BarChart2 size={14} className="text-primary flex-shrink-0" />
                  Transaction Chart
                </CardTitle>
                <button
                  type="button"
                  onClick={() => navigate('/transactions')}
                  className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors flex-shrink-0"
                >
                  View All <ChevronRight size={13} />
                </button>
              </div>

              {/* Tab switcher */}
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                {([
                  { key: 'income',  label: 'Income'  },
                  { key: 'expense', label: 'Expense' },
                  { key: 'both',    label: 'vs'      },
                ] as { key: PieMode; label: string }[]).map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPieMode(m.key)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      pieMode === m.key
                        ? 'bg-white dark:bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-3">
              {/* ── Empty state with helpful message ── */}
              {pieData.length === 0 ? (
                <EmptyState
                  label={`Belum ada transaksi ${
                    pieMode === 'income' ? 'pemasukan'
                    : pieMode === 'expense' ? 'pengeluaran'
                    : ''
                  } di ${rangeLabel}.`}
                />

              ) : pieMode === 'both' ? (
                /* ── vs mode ── */
                <>
                  {/* Contextual net insight banner */}
                  <div className={`rounded-xl px-4 py-3 mb-4 ${net >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <p className="text-[11px] text-muted-foreground mb-0.5">
                      {net >= 0 ? 'Bulan ini kamu surplus sebesar' : 'Bulan ini kamu overspend sebesar'}
                    </p>
                    <p className={`text-xl font-bold ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {net < 0 ? '-' : ''}{fmt(Math.abs(net))}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {net >= 0
                        ? 'Pengeluaran masih di bawah pemasukan 👍'
                        : 'Pengeluaran melebihi pemasukan bulan ini'}
                    </p>
                  </div>

                  {/* Donut + income/expense labels */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0" style={{ width: 120, height: 120 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%" cy="50%"
                            innerRadius={38} outerRadius={56}
                            dataKey="value"
                            strokeWidth={2}
                          >
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      {[
                        { label: 'Income', value: income, color: '#16a34a', pct: income + expense > 0 ? ((income / (income + expense)) * 100).toFixed(0) : '0' },
                        { label: 'Expense', value: expense, color: '#dc2626', pct: income + expense > 0 ? ((expense / (income + expense)) * 100).toFixed(0) : '0' },
                      ].map(row => (
                        <div key={row.label}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                            <span className="text-[11px] text-muted-foreground">{row.label}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">{row.pct}%</span>
                          </div>
                          <p className="text-sm font-bold text-foreground pl-3.5 truncate">{fmt(row.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>

              ) : (
                /* ── Income / Expense breakdown mode ── */
                <>
                  {/* Full-width pie (no duplicate legend — only breakdown list below) */}
                  <div className="w-full" style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={0}
                          outerRadius={82}
                          dataKey="value"
                          strokeWidth={2}
                        >
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Breakdown list — single source of truth, no duplicate legend above */}
                  <div className="space-y-1.5 mt-3">
                    {pieData.map((item, i) => {
                      const pct = pieTotal > 0 ? ((item.value / pieTotal) * 100).toFixed(0) : 0;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-muted/40"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-foreground font-medium truncate">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">({pct}%)</span>
                          </div>
                          <span className="text-xs font-semibold text-foreground ml-2 flex-shrink-0">{fmt(item.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Tasks ── */}
          <Card className="bg-white dark:bg-card border-2 border-blue-200 dark:border-blue-900/50 shadow-sm rounded-xl">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <CalendarClock size={14} className="text-primary flex-shrink-0" />Tasks
                </CardTitle>
                <button
                  type="button"
                  onClick={() => navigate('/tasks')}
                  className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors flex-shrink-0"
                >
                  View All <ChevronRight size={13} />
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-4">
              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  {
                    label: 'Overdue',
                    count: overdueTasks.length,
                    color: overdueTasks.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground',
                    icon: <CalendarX size={13} className={overdueTasks.length > 0 ? 'text-red-500' : 'text-slate-400'} />,
                  },
                  {
                    label: 'Urgent',
                    count: urgentTasks.length,
                    color: urgentTasks.length > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-foreground',
                    icon: <AlertCircle size={13} className={urgentTasks.length > 0 ? 'text-orange-500' : 'text-slate-400'} />,
                  },
                  {
                    label: 'Active',
                    count: activeTasks.length,
                    color: 'text-blue-600 dark:text-blue-400',
                    icon: <Clock size={13} className="text-blue-500" />,
                  },
                  {
                    label: 'Done',
                    count: completedTasks.length,
                    color: 'text-green-600 dark:text-green-400',
                    icon: <CheckCircle2 size={13} className="text-green-500" />,
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center bg-slate-50 dark:bg-muted/40 rounded-lg py-2 px-1 gap-0.5"
                  >
                    {item.icon}
                    <p className={`text-base font-bold leading-none ${item.color}`}>{item.count}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight text-center">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Upcoming</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Task list — min-h guarantees card is never clipped */}
              <div className="min-h-[96px]">
                {upcomingTasks.length > 0 ? (
                  <div className="divide-y divide-border">
                    {upcomingTasks.map(task => {
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const deadline = new Date(task.deadline); deadline.setHours(0, 0, 0, 0);
                      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const daysLabel =
                        daysLeft < 0    ? `${Math.abs(daysLeft)}d overdue`
                        : daysLeft === 0 ? 'Today'
                        : daysLeft === 1 ? 'Tomorrow'
                        : `${daysLeft}d left`;
                      const daysColor =
                        daysLeft < 0    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                        : daysLeft <= 1  ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                        : daysLeft <= 3  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                        : 'text-muted-foreground bg-muted/60';

                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between py-2 hover:bg-muted/30 cursor-pointer -mx-1 px-1 rounded-lg transition-colors"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor(task.status)}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate leading-tight">{task.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <span className={`flex-shrink-0 ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${daysColor}`}>
                            {daysLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-24 gap-1.5">
                    <CheckCircle2 size={22} className="text-green-400" />
                    <p className="text-sm text-muted-foreground">Tidak ada task upcoming</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}