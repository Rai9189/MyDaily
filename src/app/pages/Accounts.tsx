// src/app/pages/Accounts.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccounts } from '../context/AccountContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Trash2, Loader2, Wallet, Smartphone, Banknote, CreditCard } from 'lucide-react';
import { Account, AccountType } from '../types';

const MAX_BALANCE = 1_000_000_000;
const MAX_NAME = 100;

export function Accounts() {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount } = useAccounts();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'Bank' as AccountType, balance: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [balanceDisplay, setBalanceDisplay] = useState('');
  const [balanceError, setBalanceError] = useState('');

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'Bank':     return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        icon: <Wallet size={14} />,
        cardBorder: 'border-2 border-blue-200 dark:border-blue-900/50',
        dot: 'bg-blue-500',
      };
      case 'E-Wallet': return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
        icon: <Smartphone size={14} />,
        cardBorder: 'border-2 border-green-200 dark:border-green-900/50',
        dot: 'bg-green-500',
      };
      case 'Cash':     return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        icon: <Banknote size={14} />,
        cardBorder: 'border-2 border-amber-200 dark:border-amber-900/50',
        dot: 'bg-amber-500',
      };
      default: return {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        border: 'border-border',
        icon: <CreditCard size={14} />,
        cardBorder: 'border-2 border-border',
        dot: 'bg-slate-400',
      };
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

  const totalBalance   = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p className="text-red-600 dark:text-red-400">Error: {error}</p>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground/65">Your Financial Accounts</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => handleOpenDialog()}>
                  <Plus size={16} /> Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground text-lg font-semibold">
                    {editingAccount ? 'Edit Account' : 'Add New Account'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 mt-2">

                  {/* Account Name */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="name">Account Name</Label>
                      <span className={`text-xs ${formData.name.length >= MAX_NAME ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {formData.name.length}/{MAX_NAME}
                      </span>
                    </div>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => { if (e.target.value.length <= MAX_NAME) setFormData({ ...formData, name: e.target.value }); }}
                      placeholder="e.g. BCA Main, GoPay"
                      maxLength={MAX_NAME}
                      required
                    />
                  </div>

                  {/* Account Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Account Type</Label>
                    <Select value={formData.type} onValueChange={(v: AccountType) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank">Bank</SelectItem>
                        <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Balance */}
                  <div className="space-y-1.5">
                    <Label htmlFor="balance">Initial Balance</Label>
                    <div className={`flex rounded-md border overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${balanceError ? 'border-destructive' : 'border-input'}`}>
                      <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-input select-none">Rp</span>
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
                    {balanceError && <p className="text-xs text-destructive">{balanceError}</p>}
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

          {/* ── Summary Card ── */}
          <Card className="bg-primary text-primary-foreground border-0 shadow-lg rounded-xl">
            <CardContent className="pt-5 pb-5 px-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 opacity-80 mb-1">
                    <Wallet size={15} />
                    <span className="text-xs font-semibold uppercase tracking-widest">Total Balance</span>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
                  <p className="text-xs opacity-60 mt-1">{accounts.length} Account{accounts.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="opacity-10 hidden md:block"><Wallet size={56} /></div>
              </div>
              {/* Balance per type breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
                {[
                  { label: 'Bank',     icon: <Wallet size={13} />,     type: 'Bank'     },
                  { label: 'E-Wallet', icon: <Smartphone size={13} />, type: 'E-Wallet' },
                  { label: 'Cash',     icon: <Banknote size={13} />,   type: 'Cash'     },
                ].map(item => {
                  const typeAccounts = accounts.filter(a => a.type === item.type);
                  const typeBalance  = typeAccounts.reduce((s, a) => s + a.balance, 0);
                  return (
                    <div key={item.label} className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs opacity-70 leading-none">{item.label} ({typeAccounts.length})</p>
                        <p className="text-sm font-bold leading-tight mt-0.5 truncate">{formatCurrency(typeBalance)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Account Cards ── */}
          {accounts.length === 0 ? (
            <Card className="border-2 border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm">
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">No accounts yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Click "Add Account" to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => {
                const cfg = getTypeConfig(account.type);
                return (
                  <Card
                    key={account.id}
                    className={`hover:shadow-lg transition-all bg-white dark:bg-card cursor-pointer ${cfg.cardBorder}`}
                    onClick={() => navigate(`/transactions?accountId=${account.id}`)}
                  >
                    <CardContent className="p-4">
                      {/* Top row: type badge + actions */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.icon}
                          {account.type}
                        </span>
                        <div className="flex items-center gap-0" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenDialog(account)}
                            title="Edit"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-red-500 hover:text-white"
                            onClick={() => handleDelete(account.id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* Account name */}
                      <p className="text-sm font-semibold text-foreground leading-tight mb-3">{account.name}</p>

                      {/* Balance + hint */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Current Balance</p>
                          <p className="text-lg font-bold text-foreground">{formatCurrency(account.balance)}</p>
                        </div>
                        <span className="text-xs text-muted-foreground/60 pb-0.5">Tap to view →</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}