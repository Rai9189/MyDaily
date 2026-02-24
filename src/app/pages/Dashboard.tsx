import { useState, useMemo } from 'react';
import { useAccounts } from '../context/AccountContext';
import { useTransactions } from '../context/TransactionContext';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, Wallet, TrendingUp, TrendingDown, Pin, Loader2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export function Dashboard() {
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { tasks, loading: tasksLoading } = useTasks();
  const { notes, loading: notesLoading } = useNotes();
  const { categories } = useCategories();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

  const urgentTasks = useMemo(() => tasks.filter(t => t.status === 'Mendesak' && !t.completed), [tasks]);
  const pinnedNotes = useMemo(() => notes.filter(n => n.pinned), [notes]);

  const filteredTransactions = useMemo(() => {
    const today = new Date();
    return transactions.filter(t =>
      isWithinInterval(new Date(t.date), { start: startOfMonth(today), end: endOfMonth(today) })
    );
  }, [transactions]);

  const thisMonthIncome = useMemo(() =>
    filteredTransactions.filter(t => t.type === 'Masuk').reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const thisMonthExpense = useMemo(() =>
    filteredTransactions.filter(t => t.type === 'Keluar').reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const categoryChartData = useMemo(() => {
    const byCategory = filteredTransactions
      .filter(t => t.type === 'Keluar')
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
    { name: 'Urgent',    value: tasks.filter(t => t.status === 'Mendesak'    && !t.completed).length, color: '#ef4444' },
    { name: 'Upcoming',  value: tasks.filter(t => t.status === 'Mendekati'   && !t.completed).length, color: '#f59e0b' },
    { name: 'On Track',  value: tasks.filter(t => t.status === 'Masih Lama'  && !t.completed).length, color: '#10b981' },
  ], [tasks]);

  if (accountsLoading || transactionsLoading || tasksLoading || notesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your activity summary</p>
      </div>

      {/* Total Balance */}
      <Card className="bg-primary text-primary-foreground border-0 shadow-lg">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-2 mb-4 opacity-80">
            <Wallet size={20} />
            <span className="text-sm font-medium uppercase tracking-wide">Total Balance</span>
          </div>
          <p className="text-4xl font-bold mb-1">{formatCurrency(totalBalance)}</p>
          <p className="text-sm opacity-70">{accounts.length} Active Account{accounts.length !== 1 ? 's' : ''}</p>
        </CardContent>
      </Card>

      {/* This Month's Transactions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">This Month's Transactions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-border bg-card">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
                <TrendingUp size={18} />
                <span className="text-sm font-semibold">Income</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(thisMonthIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredTransactions.filter(t => t.type === 'Masuk').length} transaction(s)
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-3">
                <TrendingDown size={18} />
                <span className="text-sm font-semibold">Expenses</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(thisMonthExpense)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredTransactions.filter(t => t.type === 'Keluar').length} transaction(s)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expenses by Category */}
      {categoryChartData.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Expenses by Category <span className="text-muted-foreground font-normal text-sm">(This Month)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="amount"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {categoryChartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Status */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Task Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={taskStatusData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 13 }} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 13 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
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

      {/* Urgent Tasks */}
      {urgentTasks.length > 0 && (
        <Card className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-base">
              <AlertCircle size={18} />
              Urgent Tasks ({urgentTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-100 dark:border-red-900">
                  <div>
                    <p className="text-sm font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due: {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Pinned Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedNotes.map((note) => (
              <Card key={note.id} className="border border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Pin size={14} className="text-primary" />
                    {note.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {new Date(note.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}