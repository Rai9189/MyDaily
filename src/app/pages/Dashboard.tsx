// src/app/pages/Dashboard.tsx
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAccounts } from '../context/AccountContext';
import { useTransactions } from '../context/TransactionContext';
import { useTasks } from '../context/TaskContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  AlertCircle, Wallet, TrendingUp, TrendingDown,
  CalendarX, CheckCircle2, Clock, CalendarClock, ChevronRight, ChevronDown, BarChart2,
  Info, ArrowLeftRight, CalendarDays,
} from 'lucide-react';
import { SummaryPopup, PopupType } from '../components/SummaryPopup';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { isWithinInterval, format, eachDayOfInterval, isSameDay } from 'date-fns';
import { DateRangeFilter, defaultDateRange, getPresetRange, type DateRangeValue } from '../components/DateRangeFilter';
import { DashboardSkeleton } from '../components/Skeletons';
import { fmtIDR } from '../../lib/formatCurrency';

const fmt = fmtIDR;

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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Info size={18} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No data</p>
      <p className="text-xs text-muted-foreground text-center leading-relaxed px-4">{label}</p>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { accounts, loading: aL } = useAccounts();
  const { transactions, loading: tL } = useTransactions();
  const { tasks, loading: tkL, completeTask, refreshTasks } = useTasks();
  const { categories } = useCategories();

  const [range, setRange] = useState<DateRangeValue>(defaultDateRange());
  const [pieMode, setPieMode] = useState<PieMode>('both');

  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') refreshTasks(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [refreshTasks]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<PopupType>(null);

  useEffect(() => {
    if (!accountDropdownOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setAccountDropdownOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [accountDropdownOpen]);

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

  const transfer = useMemo(() => filteredTx.filter(t => t.type === 'transfer' && t.toAccountId).reduce((s, t) => s + t.amount, 0), [filteredTx]);

  const sparklinePoints = useMemo(() => {
    const days = eachDayOfInterval({ start: range.start, end: range.end });
    if (days.length < 2) return null;
    let cumulative = 0;
    const values = days.map(day => {
      const dayNet = filteredTx
        .filter(t => t.type !== 'transfer' && isSameDay(new Date(t.date), day))
        .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
      cumulative += dayNet;
      return cumulative;
    });
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const span = max - min || 1;
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 64;
        const y = 24 - ((v - min) / span) * 24;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [filteredTx, range]);

  const incomeTxCount   = useMemo(() => filteredTx.filter(t => t.type === 'income').length,                    [filteredTx]);
  const expenseTxCount  = useMemo(() => filteredTx.filter(t => t.type === 'expense').length,                   [filteredTx]);
  const transferTxCount = useMemo(() => filteredTx.filter(t => t.type === 'transfer' && t.toAccountId).length, [filteredTx]);

  const incomePercent  = income + expense > 0 ? ((income  / (income + expense)) * 100).toFixed(0) : undefined;
  const expensePercent = income + expense > 0 ? ((expense / (income + expense)) * 100).toFixed(0) : undefined;

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
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return tasks
      .filter(t => {
        if (t.completed) return false;
        const d = new Date(t.deadline);
        return d >= today && isWithinInterval(d, { start: range.start, end: range.end });
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 8);
  }, [tasks, range]);


  const dotBorderColor = (status: string) => {
    switch (status) {
      case 'overdue':  return 'border-red-500';
      case 'urgent':   return 'border-orange-500';
      case 'upcoming': return 'border-amber-400';
      default:         return 'border-blue-400';
    }
  };

  const handleToggleTask = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    const { success, error: err } = await completeTask(task.id);
    if (!success) toast.error(err || 'Failed to update task');
  };

  const rangeLabel = useMemo(() => {
    try { return `${format(range.start, 'd MMM')} – ${format(range.end, 'd MMM yyyy')}`; }
    catch { return 'this period'; }
  }, [range]);

  // Tab config — warna aktif berbeda per mode agar lebih kontras & informatif
  const tabConfig: { key: PieMode; label: string; activeClass: string }[] = [
    { key: 'income',  label: 'Income',  activeClass: 'bg-green-500 text-white shadow-sm dark:bg-green-500/15 dark:text-green-400' },
    { key: 'expense', label: 'Expense', activeClass: 'bg-red-500 text-white shadow-sm dark:bg-red-500/15 dark:text-red-400'   },
    { key: 'both',    label: 'Overview', activeClass: 'bg-primary text-primary-foreground shadow-sm dark:bg-primary/15 dark:text-primary' },
  ];

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
                <ChevronDown size={12} className={`text-muted-foreground transition-transform flex-shrink-0 ${accountDropdownOpen ? 'rotate-180' : ''}`} />
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

          {/* ── Quick preset chips ── */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { key: 'today',      label: 'Today'    },
              { key: 'this_week',  label: 'This Week'},
              { key: 'this_month', label: 'This Month'},
              { key: 'last_30',    label: 'Last 30d' },
              { key: 'this_year',  label: 'This Year'},
            ] as const).map(({ key, label }) => (
              <button key={key} type="button"
                onClick={() => setRange({ preset: key, ...getPresetRange(key) })}
                className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                  range.preset === key
                    ? 'bg-primary text-primary-foreground border-primary dark:bg-primary/15 dark:text-primary dark:border-primary/30'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Hero: total balance + net-flow sparkline ── */}
          <Card className="border shadow-lg rounded-xl overflow-hidden text-white bg-primary dark:border-[rgba(59,159,216,0.3)]"
            style={{ background: 'var(--balance-card-bg, var(--primary))' }}
          >
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
                {sparklinePoints ? (
                  <svg width="72" height="28" viewBox="0 0 64 24" className="flex-shrink-0 opacity-90" aria-hidden="true">
                    <polyline points={sparklinePoints} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div className="opacity-10 flex-shrink-0"><Wallet size={40} /></div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Ledger: income / expense / net, typography-led ── */}
          <Card className="bg-white dark:bg-card border shadow-sm rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-border">
              <button type="button" onClick={() => setActivePopup('income')}
                className="flex flex-col items-start px-3 py-3 text-left hover:bg-muted/40 transition-colors min-w-0"
              >
                <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <TrendingUp size={11} className="text-green-600 dark:text-green-400 flex-shrink-0" /> Income
                </span>
                <span className="text-sm font-bold text-foreground leading-tight truncate hidden sm:block">{fmt(income)}</span>
                <span className="text-base font-bold text-foreground leading-tight truncate sm:hidden">{fmtShort(income)}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {incomeTxCount} tx{incomePercent ? ` · ${incomePercent}%` : ''}
                </span>
              </button>

              <button type="button" onClick={() => setActivePopup('expense')}
                className="flex flex-col items-start px-3 py-3 text-left hover:bg-muted/40 transition-colors min-w-0"
              >
                <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <TrendingDown size={11} className="text-red-600 dark:text-red-400 flex-shrink-0" /> Expense
                </span>
                <span className="text-sm font-bold text-foreground leading-tight truncate hidden sm:block">{fmt(expense)}</span>
                <span className="text-base font-bold text-foreground leading-tight truncate sm:hidden">{fmtShort(expense)}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {expenseTxCount} tx{expensePercent ? ` · ${expensePercent}%` : ''}
                </span>
              </button>

              <div className="flex flex-col items-start px-3 py-3 min-w-0">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Net</span>
                <span className={`text-sm font-bold leading-tight truncate hidden sm:block ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {net < 0 ? '-' : ''}{fmt(Math.abs(net))}
                </span>
                <span className={`text-base font-bold leading-tight truncate sm:hidden ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {net < 0 ? '-' : ''}{fmtShort(Math.abs(net))}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate">{net >= 0 ? 'Surplus' : 'Deficit'}</span>
              </div>
            </div>
          </Card>

          {/* ── Transfer: secondary, lower visual weight ── */}
          <button type="button" onClick={() => setActivePopup('transfer')}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-card text-xs hover:bg-muted/40 transition-colors"
          >
            <ArrowLeftRight size={12} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-muted-foreground">Transfer</span>
            <span className="font-semibold text-foreground ml-auto">{fmt(transfer)}</span>
            <span className="text-muted-foreground">· {transferTxCount} tx</span>
            <ChevronRight size={12} className="opacity-50 flex-shrink-0" />
          </button>

          {/* ── Popup detail ── */}
          {activePopup === 'income' && (
            <SummaryPopup
              type="income"
              amount={income}
              txCount={incomeTxCount}
              percentage={incomePercent}
              onClose={() => setActivePopup(null)}
              onViewAll={() => { setActivePopup(null); navigate('/transactions?type=income'); }}
            />
          )}
          {activePopup === 'expense' && (
            <SummaryPopup
              type="expense"
              amount={expense}
              txCount={expenseTxCount}
              percentage={expensePercent}
              onClose={() => setActivePopup(null)}
              onViewAll={() => { setActivePopup(null); navigate('/transactions?type=expense'); }}
            />
          )}
          {activePopup === 'transfer' && (
            <SummaryPopup
              type="transfer"
              amount={transfer}
              txCount={transferTxCount}
              onClose={() => setActivePopup(null)}
              onViewAll={() => { setActivePopup(null); navigate('/transactions?type=transfer'); }}
            />
          )}

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

              {/* ── Tab: warna aktif kontras per mode ── */}
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                {tabConfig.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPieMode(m.key)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition duration-150 ${
                      pieMode === m.key
                        ? m.activeClass
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-3">
              {pieData.length === 0 ? (
                <EmptyState
                  label={
                    pieMode === 'both'
                      ? `No transactions in ${rangeLabel}.`
                      : `No ${pieMode} transactions in ${rangeLabel}.`
                  }
                />
              ) : pieMode === 'both' ? (
                /* ── Mode "vs": surplus info + donut kiri, legend kanan ── */
                <>
                  <div className={`rounded-xl px-4 py-3 mb-4 ${net >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <p className="text-[11px] text-muted-foreground mb-0.5">
                      {net >= 0 ? 'This period you have a surplus of' : 'This period you overspent by'}
                    </p>
                    <p className={`text-xl font-bold ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {net < 0 ? '-' : ''}{fmt(Math.abs(net))}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {net >= 0
                        ? 'Expenses are below income 👍'
                        : 'Expenses exceeded income this period'}
                    </p>
                  </div>

                  <div className="w-full" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" strokeWidth={2}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 mt-2">
                    {[
                      { label: 'Income',  value: income,  color: '#16a34a', pct: income + expense > 0 ? ((income  / (income + expense)) * 100).toFixed(0) : '0' },
                      { label: 'Expense', value: expense, color: '#dc2626', pct: income + expense > 0 ? ((expense / (income + expense)) * 100).toFixed(0) : '0' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-muted/40">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                          <span className="text-sm font-medium text-foreground">{row.label}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">({row.pct}%)</span>
                        </div>
                        <span className="text-sm font-bold text-foreground ml-3 flex-shrink-0">{fmt(row.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* ── Mode Income / Expense: chart tengah, detail di bawah ── */
                <>
                  <div className="w-full" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={0}
                          outerRadius={95}
                          dataKey="value"
                          strokeWidth={2}
                        >
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 mt-2">
                    {pieData.map((item, i) => {
                      const pct = pieTotal > 0 ? ((item.value / pieTotal) * 100).toFixed(0) : 0;
                      return (
                        <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-muted/40">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">({pct}%)</span>
                          </div>
                          <span className="text-sm font-bold text-foreground ml-3 flex-shrink-0">{fmt(item.value)}</span>
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
                  <CalendarClock size={14} className="text-primary flex-shrink-0" /> Tasks
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
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  { label: 'Overdue',  count: overdueTasks.length,   color: overdueTasks.length   > 0 ? 'text-red-600 dark:text-red-400'      : 'text-foreground', icon: <CalendarX    size={13} className={overdueTasks.length   > 0 ? 'text-red-500'    : 'text-slate-400'} /> },
                  { label: 'Urgent',   count: urgentTasks.length,    color: urgentTasks.length    > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-foreground', icon: <AlertCircle  size={13} className={urgentTasks.length    > 0 ? 'text-orange-500' : 'text-slate-400'} /> },
                  { label: 'Active',   count: activeTasks.length,    color: 'text-blue-600 dark:text-blue-400',                                                    icon: <Clock        size={13} className="text-blue-500" /> },
                  { label: 'Done',     count: completedTasks.length, color: 'text-green-600 dark:text-green-400',                                                  icon: <CheckCircle2 size={13} className="text-green-500" /> },
                ].map(item => (
                  <div key={item.label} className="flex flex-col items-center bg-slate-50 dark:bg-muted/40 rounded-lg py-2 px-1 gap-0.5">
                    {item.icon}
                    <p className={`text-base font-bold leading-none ${item.color}`}>{item.count}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight text-center">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* ── "Upcoming" header lebih tegas ── */}
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex-1 h-px bg-border" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[11px] text-foreground font-semibold uppercase tracking-widest">Upcoming</span>
                  <span className="text-[10px] text-muted-foreground">{rangeLabel}</span>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="min-h-[96px]">
                {upcomingTasks.length > 0 ? (
                  <div className="divide-y divide-border">
                    {upcomingTasks.map((task, i) => {
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
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.2, ease: 'easeOut' }}
                          className="flex items-center justify-between py-2 hover:bg-muted/30 cursor-pointer -mx-1 px-1 rounded-lg transition-colors"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => handleToggleTask(e, task)}
                              title="Mark complete"
                              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/50 active:bg-muted/70 transition active:scale-95"
                            >
                              <span className={`w-3 h-3 rounded-full border-2 block ${dotBorderColor(task.status)}`} />
                            </button>
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
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── Empty state: icon CalendarDays (bukan centang) ── */
                  <div className="flex flex-col items-center justify-center h-24 gap-1.5">
                    <CalendarDays size={24} className="text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No upcoming tasks</p>
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