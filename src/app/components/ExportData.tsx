import { useState } from 'react';
import { FileJson, FileText } from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { inDateRange } from '../../lib/exportRange';
import { stripHtml } from '../../lib/stripHtml';

// Quotes would break the columns, and spreadsheets run a leading = + - @ as a formula.
function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function ExportData() {
  const { transactions, loading: loadingTransactions } = useTransactions();
  const { accounts, loading: loadingAccounts } = useAccounts();
  const { categories, loading: loadingCategories } = useCategories();
  // Exporting mid-load would silently produce a file with no rows.
  const loading = loadingTransactions || loadingAccounts || loadingCategories;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const selected = transactions.filter(t => inDateRange(t.date, from, to));
  const emptyRange = (from !== '' || to !== '') && selected.length === 0;
  const disabled = loading || emptyRange;

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Type', 'Category', 'Account', 'Amount'];
    const rows = selected.map(t => [
      t.date,
      stripHtml(t.description ?? ''),
      t.type,
      categories.find(c => c.id === t.categoryId)?.name || 'Other',
      accounts.find(a => a.id === t.accountId)?.name || 'Account',
      t.amount,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(csvCell).join(',')),
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
      dateRange: { from: from || null, to: to || null },
      transactions: selected.map(t => ({
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
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="exportFrom" className="text-xs">From</Label>
          <Input id="exportFrom" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="exportTo" className="text-xs">To</Label>
          <Input id="exportTo" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {emptyRange
          ? 'No transactions in this range'
          : from || to ? `${selected.length} transactions selected` : 'Leave both dates empty to export everything'}
      </p>
      <button
        onClick={exportToCSV}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileText size={16} />
        Export to CSV
      </button>
      <button
        onClick={exportToJSON}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileJson size={16} />
        Export to JSON
      </button>
    </div>
  );
}
