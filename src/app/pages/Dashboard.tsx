import { useState } from 'react';
import { dummyAccounts, dummyTransactions, dummyTasks, dummyNotes, dummyCategories } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertCircle, Wallet, TrendingUp, TrendingDown, PinIcon } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRange } from '../types';

export function Dashboard() {
  const [transactionRange, setTransactionRange] = useState<DateRange>('month');
  const [taskRange, setTaskRange] = useState<DateRange>('month');
  
  const totalBalance = dummyAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const urgentTasks = dummyTasks.filter(t => t.status === 'Mendesak' && !t.completed);
  const pinnedNotes = dummyNotes.filter(n => n.pinned);
  
  const thisMonthIncome = dummyTransactions
    .filter(t => t.type === 'Masuk')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const thisMonthExpense = dummyTransactions
    .filter(t => t.type === 'Keluar')
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Transaction Chart Data (by category)
  const transactionByCategory = dummyTransactions
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

  // Transaction Trend Data (daily)
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
    { name: 'Mendesak', value: dummyTasks.filter(t => t.status === 'Mendesak' && !t.completed).length, color: '#ef4444' },
    { name: 'Mendekati', value: dummyTasks.filter(t => t.status === 'Mendekati' && !t.completed).length, color: '#f59e0b' },
    { name: 'Masih Lama', value: dummyTasks.filter(t => t.status === 'Masih Lama' && !t.completed).length, color: '#10b981' },
  ];

  const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Dashboard</h1>
        <p className="text-gray-500 mt-1">Ringkasan aktivitas Anda</p>
      </div>

      {/* Total Saldo */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
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
        <h2 className="text-xl mb-4">Transaksi Bulan Ini</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <TrendingUp size={20} />
                Pemasukan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl">{formatCurrency(thisMonthIncome)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {dummyTransactions.filter(t => t.type === 'Masuk').length} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <TrendingDown size={20} />
                Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl">{formatCurrency(thisMonthExpense)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {dummyTransactions.filter(t => t.type === 'Keluar').length} transaksi
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grafik Transaksi */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tren Transaksi</CardTitle>
            <Select value={transactionRange} onValueChange={(value: DateRange) => setTransactionRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
                <SelectItem value="custom">Range Tertentu</SelectItem>
              </SelectContent>
            </Select>
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
      <Card>
        <CardHeader>
          <CardTitle>Pengeluaran per Kategori</CardTitle>
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

      {/* Grafik Status Tugas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Status Tugas</CardTitle>
            <Select value={taskRange} onValueChange={(value: DateRange) => setTaskRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
                <SelectItem value="custom">Range Tertentu</SelectItem>
              </SelectContent>
            </Select>
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
              {urgentTasks.map((task) => (
                <div key={task.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <div>
                    <p>{task.title}</p>
                    <p className="text-sm text-gray-500">
                      Deadline: {new Date(task.deadline).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <Badge variant="destructive">🔴 Mendesak</Badge>
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
