import { Download, FileJson, FileText } from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';

export function ExportData() {
  const { transactions } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Type', 'Category', 'Account', 'Amount'];
    const rows = transactions.map(t => [
      t.date,
      t.description,
      t.type,
      categories.find(c => c.id === t.categoryId)?.name || 'Other',
      accounts.find(a => a.id === t.accountId)?.name || 'Account',
      t.amount,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      transactions: transactions.map(t => ({
        ...t,
        categoryName: categories.find(c => c.id === t.categoryId)?.name,
        accountName: accounts.find(a => a.id === t.accountId)?.name,
      })),
      accounts,
      categories,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mydaily-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={exportToCSV}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
      >
        <FileText size={16} />
        Export to CSV
      </button>
      <button
        onClick={exportToJSON}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
      >
        <FileJson size={16} />
        Export to JSON
      </button>
    </div>
  );
}
