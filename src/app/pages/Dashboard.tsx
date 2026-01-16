import { useState } from 'react';
import { dummyAccounts, dummyTransactions, dummyTasks, dummyNotes, dummyCategories } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { AlertCircle, Wallet, TrendingUp, TrendingDown, PinIcon, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';

export function Dashboard() {
  const [transactionRange, setTransactionRange] = useState<string>('month');
  const [taskRange, setTaskRange] = useState<string>('month');
  
  // Custom date ranges
  const [transactionDateFrom, setTransactionDateFrom] = useState<Date>();
  const [transactionDateTo, setTransactionDateTo] = useState<Date>();
  const [taskDateFrom, setTaskDateFrom] = useState<Date>();
  const [taskDateTo, setTaskDateTo] = useState<Date>();
  
  const totalBalance = dummyAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const urgentTasks = dummyTasks.filter(t => t.status === 'Mendesak' && !t.completed);
  const pinnedNotes = dummyNotes.filter(n => n.pinned);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionDateRange = () => {
    const today = new Date();
    switch (transactionRange) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'week':
        return { start: startOfWeek(today, { locale: id }), end: endOfWeek(today, { locale: id }) };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'year':
        return { start: startOfYear(today), end: endOfYear(today) };
      case 'custom':
        return transactionDateFrom && transactionDateTo ? { start: transactionDateFrom, end: transactionDateTo } : null;
      default:
        return null;
    }
  };

  const getTaskDateRange = () => {
    const today = new Date();
    switch (taskRange) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'week':
        return { start: startOfWeek(today, { locale: id }), end: endOfWeek(today, { locale: id }) };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'year':
        return { start: startOfYear(today), end: endOfYear(today) };
      case 'custom':
        return taskDateFrom && taskDateTo ? { start: taskDateFrom, end: taskDateTo } : null;
      default:
        return null;
    }
  };

  // Filter transactions by date range
  const filteredTransactions = dummyTransactions.filter(t => {
    const dateRange = getTransactionDateRange();
    if (!dateRange) return true;
    const transactionDate = new Date(t.date);
    return isWithinInterval(transactionDate, { start: dateRange.start, end: dateRange.end });
  });

  // Filter tasks by date range
  const filteredTasks = dummyTasks.filter(t => {
    const dateRange = getTaskDateRange();
    if (!dateRange) return true;
    const taskDate = new Date(t.deadline);
    return isWithinInterval(taskDate, { start: dateRange.start, end: dateRange.end });
  });

  const thisMonthIncome = filteredTransactions
    .filter(t => t.type === 'Masuk')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const thisMonthExpense = filteredTransactions
    .filter(t => t.type === 'Keluar')
    .reduce((sum, t) => sum + t.amount, 0);

  // Transaction Chart Data (by category)
  const transactionByCategory = filteredTransactions
    .filter(t => t.type === 'Keluar')
    .reduce((acc, t) => {
      const category = dummyCategories.find(c => c.id === t.categoryId);
      const categoryName = category?.name || 'Lainnya';
      
      if (!acc[categoryName]) {
        acc[categoryName] = { name: categoryName, amount: 0, color: category?.color || '#gray' };
      }
      acc[categoryName].amount += t.amount;
      return acc;
    }, {} as Record<string, { name: string; amount: number; color: string }>);

  const categoryChartData = Object.values(transactionByCategory);

  // Transaction Trend Data (daily) - mock data based on filtered
  const transactionTrendData = [
    { date: '07 Dec', income: 0, expense: 150000 },
    { date: '08 Dec', income: 0, expense: 300000 },
    { date: '10 Dec', income: 5000000, expense: 0 },
    { date: '11 Dec', income: 0, expense: 750000 },
    { date: '12 Dec', income: 0, expense: 1500000 },
    { date: '13 Dec', income: 200000, expense: 85000 },
  ];

  // Task Status Data
  const taskStatusData = [
    { name: 'Mendesak', value: filteredTasks.filter(t => t.status === 'Mendesak' && !t.completed).length, color: '#ef4444' },
    { name: 'Mendekati', value: filteredTasks.filter(t => t.status === 'Mendekati' && !t.completed).length, color: '#f59e0b' },
    { name: 'Masih Lama', value: filteredTasks.filter(t => t.status === 'Masih Lama' && !t.completed).length, color: '#10b981' },
  ];

  const getRangeLabel = (range: string) => {
    switch (range) {
      case 'today': return 'Hari Ini';
      case 'week': return 'Minggu Ini';
      case 'month': return 'Bulan Ini';
      case 'year': return 'Tahun Ini';
      case 'custom': return 'Range Bebas';
      default: return '';
    }
  };

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
          <p className="text-blue-100 mt-2">{dummyAccounts.length} Akun Aktif</p>
        </CardContent>
      </Card>

      {/* Ringkasan Transaksi */}
      <div>
        <h2 className="text-xl mb-4 dark:text-white">Transaksi {getRangeLabel(transactionRange)}</h2>
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

      {/* Grafik Transaksi */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <CardTitle className="dark:text-white">Tren Transaksi</CardTitle>
            <div className="flex flex-col gap-2">
              <Select value={transactionRange} onValueChange={setTransactionRange}>
                <SelectTrigger className="w-full md:w-40 dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                  <SelectItem value="custom">Range Bebas</SelectItem>
                </SelectContent>
              </Select>
              
              {transactionRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {transactionDateFrom ? format(transactionDateFrom, 'dd/MM', { locale: id }) : 'Dari'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={transactionDateFrom}
                        onSelect={setTransactionDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {transactionDateTo ? format(transactionDateTo, 'dd/MM', { locale: id }) : 'Sampai'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={transactionDateTo}
                        onSelect={setTransactionDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={transactionTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value as number)}
              />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10b981" name="Pemasukan" strokeWidth={2} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Pengeluaran" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grafik Pengeluaran per Kategori */}
      {categoryChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pengeluaran per Kategori ({getRangeLabel(transactionRange)})</CardTitle>
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
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grafik Status Tugas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <CardTitle>Status Tugas</CardTitle>
            <div className="flex flex-col gap-2">
              <Select value={taskRange} onValueChange={setTaskRange}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                  <SelectItem value="custom">Range Bebas</SelectItem>
                </SelectContent>
              </Select>
              
              {taskRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {taskDateFrom ? format(taskDateFrom, 'dd/MM', { locale: id }) : 'Dari'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={taskDateFrom}
                        onSelect={setTaskDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {taskDateTo ? format(taskDateTo, 'dd/MM', { locale: id }) : 'Sampai'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={taskDateTo}
                        onSelect={setTaskDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
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
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle size={20} />
              Tugas Mendesak ({urgentTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <div>
                    <p>{task.title}</p>
                    <p className="text-sm text-gray-500">
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
          <h2 className="text-xl mb-4">Catatan Terpin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedNotes.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PinIcon size={16} className="text-blue-600" />
                    {note.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
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