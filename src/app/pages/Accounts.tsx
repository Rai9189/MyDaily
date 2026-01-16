import { useState } from 'react';
import { dummyAccounts } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Account } from '../types';

export function Accounts() {
  const [accounts] = useState<Account[]>(dummyAccounts);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Bank':
        return 'bg-blue-100 text-blue-700';
      case 'E-Wallet':
        return 'bg-green-100 text-green-700';
      case 'Cash':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl dark:text-white">Akun Keuangan</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola semua akun keuangan Anda</p>
        </div>
        <Button className="gap-2">
          <Plus size={20} />
          Tambah Akun
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg dark:text-white">{account.name}</CardTitle>
                  <Badge className={`mt-2 ${getTypeColor(account.type)}`}>
                    {account.type}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Saat Ini</p>
                <p className="text-2xl mt-1 dark:text-white">{formatCurrency(account.balance)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Akun</p>
              <p className="text-2xl dark:text-white">{accounts.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Saldo</p>
              <p className="text-2xl dark:text-white">
                {formatCurrency(accounts.reduce((sum, acc) => sum + acc.balance, 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bank</p>
              <p className="text-2xl dark:text-white">
                {accounts.filter(a => a.type === 'Bank').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">E-Wallet</p>
              <p className="text-2xl dark:text-white">
                {accounts.filter(a => a.type === 'E-Wallet').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}