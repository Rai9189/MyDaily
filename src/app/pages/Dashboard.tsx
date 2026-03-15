// src/app/pages/Dashboard.tsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccounts } from '../context/AccountContext';
import { useTransactions } from '../context/TransactionContext';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, Wallet, TrendingUp, TrendingDown, Pin, Loader2, CalendarX, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export function Dashboard() {
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { tasks, loading: tasksLoading } = useTasks();
  const { notes, loading: notesLoading } = useNotes();
  const { categories } = useCategories();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

  const urgentTasks = useMemo(() =>
    tasks.filter(t => (t.status === 'urgent' || t.status === 'overdue') && !t.completed), [tasks]);

  const overdueTasks  = useMemo(() => tasks.filter(t => t.status === 'overdue'  && !t.completed), [tasks]);
  const pinnedNotes   = useMemo(() => notes.filter(n => n.pinned), [notes]);

  const filteredTransactions = useMemo(() => {
    const today = new Date();
    return transactions.filter(t =>
      isWithinInterval(new Date(t.date), { start: startOfMonth(today), end: endOfMonth(today) })
    );
  }, [transactions]);

  const thisMonthIncome  = useMemo(() => filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filteredTransactions]);
  const thisMonthExpense = useMemo(() => filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filteredTransactions]);

  const categoryChartData = useMemo(() => {
    const byCategory = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const category = categories.find(c => c.id === t.categoryId);
        const name = category?.name || 'Other';
        if (!acc[name]) acc[name] = { name, amount: 0, color: category?.color || '#6b7280' };
        acc[name].amount += t.amount;
        return acc;
      }, {} as Record<string, { name: string; amount: number; color: string }>);
    return Object.values(byCategory);
  }, [filteredTransactions, categories]);

  const taskStatusData = useMemo(() => [
    { name: 'Overdue',  value: tasks.filter(t => t.status === 'overdue'  && !t.completed).length, color: '#b91c1c' },
    { name: 'Urgent',   value: tasks.filter(t => t.status === 'urgent'   && !t.completed).length, color: '#ef4444' },
    { name: 'Upcoming', value: tasks.filter(t => t.status === 'upcoming' && !t.completed).length, color: '#f59e0b' },
    { name: 'On Track', value: tasks.filter(t => t.status === 'on_track' && !t.completed).length, color: '#10b981' },
  ], [tasks]);

  const completedTasksCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const activeTasksCount    = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);

  if (accountsLoading || transactionsLoading || tasksLoading || notesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-0">
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="space-y-6 pb-6">

          {/* ── Subheading — no h1, navbar handles title ── */}
          <p className="text-sm font-medium text-foreground/65">Your Activity Summary</p>

          {/* ── Total Balance ── */}
          <Card className="bg-primary text-primary-foreground border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3 opacity-80">
                    <Wallet size={18} />
                    <span className="text-xs font-semibold uppercase tracking-widest">Total Balance</span>
                  </div>
                  <p className="text-3xl md:text-4xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
                  <p className="text-sm opacity-70 mt-1">
                    {accounts.length} Active Account{accounts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="opacity-10 hidden md:block">
                  <Wallet size={72} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── This Month's Transactions ── */}
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">
              This Month's Transactions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Income */}
              <Card className="bg-white dark:bg-card border-2 border-green-200 dark:border-green-900/50 shadow-sm hover:shadow-md transition-shadow rounded-xl">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <TrendingUp size={16} />
                      </div>
                      <span className="text-sm font-semibold">Income</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {filteredTransactions.filter(t => t.type === 'income').length} txn
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(thisMonthIncome)}</p>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card className="bg-white dark:bg-card border-2 border-red-200 dark:border-red-900/50 shadow-sm hover:shadow-md transition-shadow rounded-xl">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <TrendingDown size={16} />
                      </div>
                      <span className="text-sm font-semibold">Expenses</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {filteredTransactions.filter(t => t.type === 'expense').length} txn
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(thisMonthExpense)}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── Task Overview ── */}
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Task Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Overdue */}
              <Card className={`bg-white dark:bg-card rounded-xl shadow-sm border-2 ${overdueTasks.length > 0 ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-border'}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CalendarX size={15} className={overdueTasks.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'} />
                    <span className="text-xs font-medium text-slate-500 dark:text-foreground/60">Overdue</span>
                  </div>
                  <p className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                    {overdueTasks.length}
                  </p>
                </CardContent>
              </Card>

              {/* Urgent */}
              <Card className={`bg-white dark:bg-card rounded-xl shadow-sm border-2 ${urgentTasks.filter(t => t.status === 'urgent').length > 0 ? 'border-orange-300 dark:border-orange-800' : 'border-slate-200 dark:border-border'}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle size={15} className={urgentTasks.filter(t => t.status === 'urgent').length > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400'} />
                    <span className="text-xs font-medium text-slate-500 dark:text-foreground/60">Urgent</span>
                  </div>
                  <p className={`text-2xl font-bold ${urgentTasks.filter(t => t.status === 'urgent').length > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-foreground'}`}>
                    {urgentTasks.filter(t => t.status === 'urgent').length}
                  </p>
                </CardContent>
              </Card>

              {/* Active */}
              <Card className="bg-white dark:bg-card rounded-xl shadow-sm border-2 border-blue-200 dark:border-blue-900/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock size={15} className="text-blue-500 dark:text-blue-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-foreground/60">Active</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeTasksCount}</p>
                </CardContent>
              </Card>

              {/* Completed */}
              <Card className="bg-white dark:bg-card rounded-xl shadow-sm border-2 border-green-200 dark:border-green-900/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 size={15} className="text-green-500 dark:text-green-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-foreground/60">Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTasksCount}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Expenses by Category */}
            {categoryChartData.length > 0 ? (
              <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Expenses By Category
                    <span className="text-slate-400 font-normal text-xs ml-1">(This Month)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={70} dataKey="amount" strokeWidth={2}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend formatter={(value) => <span style={{ fontSize: '11px', color: 'var(--foreground)' }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {categoryChartData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-muted/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-foreground truncate">{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground ml-2 flex-shrink-0">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Expenses By Category
                    <span className="text-slate-400 font-normal text-xs ml-1">(This Month)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-sm text-slate-400">No expense data this month</p>
                </CardContent>
              </Card>
            )}

            {/* Task Status Chart */}
            <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Task Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={taskStatusData} barSize={36} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} allowDecimals={false} width={28} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--foreground)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ── Overdue Tasks ── */}
          {overdueTasks.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarX size={16} className="text-red-600 dark:text-red-400" />
                Overdue Tasks
                <span className="text-sm font-normal text-slate-400">({overdueTasks.length})</span>
              </h2>
              <div className="rounded-xl overflow-hidden bg-white dark:bg-card border-2 border-red-300 dark:border-red-800 shadow-sm">
                <div className="divide-y divide-red-100 dark:divide-red-900/30">
                  {overdueTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 cursor-pointer transition-colors"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Due: {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-xs flex-shrink-0 ml-3">Overdue</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Urgent Tasks ── */}
          {urgentTasks.filter(t => t.status === 'urgent').length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-orange-500 dark:text-orange-400" />
                Urgent Tasks
                <span className="text-sm font-normal text-slate-400">({urgentTasks.filter(t => t.status === 'urgent').length})</span>
              </h2>
              <div className="rounded-xl overflow-hidden bg-white dark:bg-card border-2 border-orange-200 dark:border-orange-800 shadow-sm">
                <div className="divide-y divide-orange-100 dark:divide-orange-900/30">
                  {urgentTasks.filter(t => t.status === 'urgent').slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer transition-colors"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Due: {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <Badge className="text-xs flex-shrink-0 ml-3 bg-orange-500 hover:bg-orange-600 text-white">Urgent</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Pinned Notes ── */}
          {pinnedNotes.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Pin size={15} className="text-amber-500" />
                Pinned Notes
                <span className="text-sm font-normal text-slate-400">({pinnedNotes.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="bg-white dark:bg-card border-2 border-amber-400 dark:border-amber-500 shadow-sm hover:shadow-md transition-all cursor-pointer rounded-xl"
                    onClick={() => navigate(`/notes/${note.id}`)}
                  >
                    <CardContent className="p-4">
                      {/* Category badge */}
                      {(() => {
                        const cat = categories.find(c => c.id === note.categoryId);
                        return cat ? (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full border inline-block mb-2"
                            style={{ borderColor: cat.color, color: cat.color }}
                          >
                            {cat.name}
                          </span>
                        ) : null;
                      })()}

                      {/* Title with gold pin */}
                      <div className="flex items-start gap-2 mb-1">
                        <Pin size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{note.title}</p>
                      </div>

                      {/* Content preview */}
                      <p className="text-sm text-slate-500 dark:text-muted-foreground line-clamp-3 ml-5">{note.content}</p>

                      {/* Timestamp */}
                      <p className="text-xs text-slate-400 mt-3 ml-5">
                        {new Date(note.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}