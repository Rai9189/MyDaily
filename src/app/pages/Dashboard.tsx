import { useState, useMemo } from 'react';
import { useAccounts } from '../context/AccountContext';
import { useTransactions } from '../context/TransactionContext';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NoteContext';
import { useCategories } from '../context/CategoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertCircle, Wallet, TrendingUp, TrendingDown, PinIcon, Loader2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export function Dashboard() {
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { tasks, loading: tasksLoading } = useTasks();
  const { notes, loading: notesLoading } = useNotes();
  const { categories } = useCategories();
  
  const [transactionRange, setTransactionRange] = useState<string>('month');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate data
  const totalBalance = useMemo(() => 
    accounts.reduce((sum, acc) => sum + acc.balance, 0),
    [accounts]
  );

  const urgentTasks = useMemo(() => 
    tasks.filter(t => t.status === 'Mendesak' && !t.completed),
    [tasks]
  );

  const pinnedNotes = useMemo(() => 
    notes.filter(n => n.pinned),
    [notes]
  );

  // Filter transactions by month
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
    });
  }, [transactions]);

  const thisMonthIncome = useMemo(() => 
    filteredTransactions
      .filter(t => t.type === 'Masuk')
      .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );
  
  const thisMonthExpense = useMemo(() => 
    filteredTransactions
      .filter(t => t.type === 'Keluar')
      .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  // Transaction by category
  const categoryChartData = useMemo(() => {
    const transactionByCategory = filteredTransactions
      .filter(t => t.type === 'Keluar')
      .reduce((acc, t) => {
        const category = categories.find(c => c.id === t.categoryId);
        const categoryName = category?.name || 'Lainnya';
        
        if (!acc[categoryName]) {
          acc[categoryName] = { name: categoryName, amount: 0, color: category?.color || '#gray' };
        }
        acc[categoryName].amount += t.amount;
        return acc;
      }, {} as Record<string, { name: string; amount: number; color: string }>);

    return Object.values(transactionByCategory);
  }, [filteredTransactions, categories]);

  // Task status data
  const taskStatusData = useMemo(() => [
    { name: 'Mendesak', value: tasks.filter(t => t.status === 'Mendesak' && !t.completed).length, color: '#ef4444' },
    { name: 'Mendekati', value: tasks.filter(t => t.status === 'Mendekati' && !t.completed).length, color: '#f59e0b' },
    { name: 'Masih Lama', value: tasks.filter(t => t.status === 'Masih Lama' && !t.completed).length, color: '#10b981' },
  ], [tasks]);

  const isLoading = accountsLoading || transactionsLoading || tasksLoading || notesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Ringkasan aktivitas Anda</p>
      </div>

      {/* Total Saldo */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 text-white">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet size={24} />
            Total Saldo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl">{formatCurrency(totalBalance)}</p>
          <p className="text-blue-100 mt-2">{accounts.length} Akun Aktif</p>
        </CardContent>
      </Card>

      {/* Ringkasan Transaksi */}
      <div>
        <h2 className="text-xl mb-4 dark:text-white">Transaksi Bulan Ini</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <TrendingUp size={20} />
                Pemasukan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl dark:text-white">{formatCurrency(thisMonthIncome)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredTransactions.filter(t => t.type === 'Masuk').length} transaksi
              </p>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <TrendingDown size={20} />
                Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl dark:text-white">{formatCurrency(thisMonthExpense)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredTransactions.filter(t => t.type === 'Keluar').length} transaksi
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grafik Pengeluaran per Kategori */}
      {categoryChartData.length > 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Pengeluaran per Kategori (Bulan Ini)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
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
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm dark:text-white">{item.name}</span>
                    </div>
                    <span className="text-sm dark:text-white">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grafik Status Tugas */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Status Tugas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taskStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Jumlah Tugas">
                {taskStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tugas Mendesak */}
      {urgentTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle size={20} />
              Tugas Mendesak ({urgentTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="dark:text-white">{task.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Deadline: {new Date(task.deadline).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <Badge variant="destructive">Mendesak</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Terpin */}
      {pinnedNotes.length > 0 && (
        <div>
          <h2 className="text-xl mb-4 dark:text-white">Catatan Terpin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedNotes.map((note) => (
              <Card key={note.id} className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 dark:text-white">
                    <PinIcon size={16} className="text-blue-600" />
                    {note.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{note.content}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {new Date(note.timestamp).toLocaleString('id-ID')}
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