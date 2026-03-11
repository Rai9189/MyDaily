import { useState } from 'react';
import { useAccounts } from '../context/AccountContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Trash2, Loader2, Wallet, Smartphone, Banknote } from 'lucide-react';
import { Account, AccountType } from '../types';

const MAX_BALANCE = 1_000_000_000; // 1 miliar
const MAX_NAME = 100;

export function Accounts() {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount } = useAccounts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Bank' as AccountType,
    balance: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [balanceDisplay, setBalanceDisplay] = useState('');
  const [balanceError, setBalanceError] = useState('');

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'Bank':     return { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300',   icon: <Wallet size={14} /> };
      case 'E-Wallet': return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: <Smartphone size={14} /> };
      case 'Cash':     return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: <Banknote size={14} /> };
      default:         return { bg: 'bg-muted',                           text: 'text-muted-foreground',              icon: null };
    }
  };

  const handleOpenDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({ name: account.name, type: account.type, balance: account.balance });
      setBalanceDisplay(account.balance > 0 ? account.balance.toLocaleString('id-ID') : '');
    } else {
      setEditingAccount(null);
      setFormData({ name: '', type: 'Bank', balance: 0 });
      setBalanceDisplay('');
    }
    setBalanceError('');
    setIsDialogOpen(true);
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const numeric = raw === '' ? 0 : parseInt(raw, 10);

    // ✅ Clamp ke MAX_BALANCE — tampilkan warning tapi tetap bisa save
    if (numeric > MAX_BALANCE) {
      setBalanceError('Maximum balance is Rp 1,000,000,000');
      setFormData({ ...formData, balance: MAX_BALANCE });
      setBalanceDisplay(MAX_BALANCE.toLocaleString('id-ID'));
      return;
    }

    setBalanceError('');
    setFormData({ ...formData, balance: numeric });
    setBalanceDisplay(raw === '' ? '' : numeric.toLocaleString('id-ID'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (balanceError) return;
    setSubmitting(true);
    try {
      if (editingAccount) {
        const { success, error } = await updateAccount(editingAccount.id, formData);
        if (success) setIsDialogOpen(false);
        else alert(error || 'Failed to update account');
      } else {
        const { success, error } = await createAccount(formData);
        if (success) setIsDialogOpen(false);
        else alert(error || 'Failed to create account');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    const { success, error } = await deleteAccount(id);
    if (!success) alert(error || 'Failed to delete account');
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your financial accounts</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus size={18} />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground text-lg font-semibold">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-2">

              {/* Account Name — max 100 karakter */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="name">Account Name</Label>
                  {/* ✅ Counter karakter */}
                  <span className={`text-xs ${formData.name.length >= MAX_NAME ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {formData.name.length}/{MAX_NAME}
                  </span>
                </div>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    // ✅ Potong di 100 karakter
                    if (e.target.value.length <= MAX_NAME) {
                      setFormData({ ...formData, name: e.target.value });
                    }
                  }}
                  placeholder="e.g. BCA Main, GoPay"
                  maxLength={MAX_NAME}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type">Account Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: AccountType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank">Bank</SelectItem>
                    <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Initial Balance — max 1 miliar */}
              <div className="space-y-1.5">
                <Label htmlFor="balance">Initial Balance</Label>
                <div className={`flex rounded-md border overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                  balanceError ? 'border-destructive' : 'border-input'
                }`}>
                  <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-input select-none">
                    Rp
                  </span>
                  <Input
                    id="balance"
                    type="text"
                    inputMode="numeric"
                    value={balanceDisplay}
                    onChange={handleBalanceChange}
                    placeholder="0"
                    required
                    className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {/* ✅ Pesan error jika melebihi 1 miliar */}
                {balanceError && (
                  <p className="text-xs text-destructive">{balanceError}</p>
                )}
                <p className="text-xs text-muted-foreground">Maximum: Rp 1,000,000,000</p>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : editingAccount ? 'Update Account' : 'Save Account'
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="bg-primary text-primary-foreground border-0 shadow-lg">
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm opacity-70 mb-1">Total Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
            </div>
            <div>
              <p className="text-sm opacity-70 mb-1">Total Accounts</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </div>
            <div>
              <p className="text-sm opacity-70 mb-1">Bank</p>
              <p className="text-2xl font-bold">{accounts.filter(a => a.type === 'Bank').length}</p>
            </div>
            <div>
              <p className="text-sm opacity-70 mb-1">E-Wallet</p>
              <p className="text-2xl font-bold">{accounts.filter(a => a.type === 'E-Wallet').length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Cards */}
      {accounts.length === 0 ? (
        <Card className="border border-border bg-card">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No accounts yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Click "Add Account" to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const style = getTypeStyle(account.type);
            return (
              <Card key={account.id} className="hover:shadow-md transition-shadow border border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {style.icon}
                        {account.type}
                      </span>
                      <p className="font-semibold text-foreground mt-2">{account.name}</p>
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Current Balance</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(account.balance)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenDialog(account)}
                        title="Edit"
                      >
                        <Edit size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-red-500 hover:text-white"
                        onClick={() => handleDelete(account.id)}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}