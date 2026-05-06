// src/app/pages/Accounts.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccounts } from '../context/AccountContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  Plus, Edit, Trash2, Loader2, Wallet, Smartphone, Banknote,
  CreditCard, ArrowUpCircle, ArrowDownCircle, Star,
} from 'lucide-react';
import { Account, AccountType } from '../types';
import { toast } from 'sonner';
import { ListPageSkeleton } from '../components/Skeletons';

const MAX_BALANCE = 1_000_000_000;
const MAX_NAME = 100;

interface ConfirmState {
  open: boolean;
  accountName: string;
  onConfirm: () => void;
}

const DEFAULT_CONFIRM: ConfirmState = { open: false, accountName: '', onConfirm: () => {} };

function formatBalanceDisplay(value: number): string {
  if (!value || value === 0) return '';
  const [intPart, decPart] = value.toString().split('.');
  const formattedInt = Number(intPart).toLocaleString('id-ID');
  return decPart ? `${formattedInt},${decPart}` : formattedInt;
}

function parseBalanceInput(display: string): number {
  // Format Indonesia: titik = ribuan, koma = desimal
  // "50.000"     → "50000"     → 50000
  // "300.010,50" → "300010.50" → 300010.50
  const normalized = display
    .replace(/\./g, '')  // hapus semua titik (pemisah ribuan)
    .replace(',', '.');  // ganti koma desimal ke titik (JS standard)
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function handleBalanceKeyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const hasComma   = cleaned.includes(',');
  const commaIndex = cleaned.indexOf(',');
  const afterComma = hasComma ? cleaned.slice(commaIndex + 1) : '';
  if ((cleaned.match(/,/g) || []).length > 1) return raw.slice(0, -1);
  if (hasComma && afterComma.length > 2) return raw.slice(0, -1);
  const intRaw = hasComma
    ? cleaned.slice(0, commaIndex).replace(/\./g, '')
    : cleaned.replace(/\./g, '');
  if (!intRaw && !hasComma) return '';
  const formattedInt = intRaw ? Number(intRaw).toLocaleString('id-ID') : '0';
  if (hasComma) return `${formattedInt},${afterComma}`;
  return formattedInt;
}

export function Accounts() {
  const { accounts, loading, error, createAccount, updateAccount, updateAccountWithAdjustment, deleteAccount, setPrimaryAccount } = useAccounts();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'Bank' as AccountType, balance: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [balanceDisplay, setBalanceDisplay] = useState('');
  const [balanceError, setBalanceError] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>(DEFAULT_CONFIRM);

  const [adjustConfirm, setAdjustConfirm] = useState<{
    open: boolean;
    diff: number;
    newBalance: number;
    pendingSubmit: (() => Promise<void>) | null;
  }>({ open: false, diff: 0, newBalance: 0, pendingSubmit: null });

  useEffect(() => {
    if (new URLSearchParams(location.search).get('add') !== 'true') return;
    setEditingAccount(null);
    setFormData({ name: '', type: 'Bank', balance: 0 });
    setBalanceDisplay('');
    setBalanceError('');
    setIsDialogOpen(true);
    navigate('/accounts', { replace: true });
  }, [location.search, navigate]);

  const closeConfirm = () => setConfirmState(DEFAULT_CONFIRM);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'Bank':     return { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', icon: <Wallet size={14} />, cardBorder: 'border-2 border-blue-200 dark:border-blue-900/50', dot: 'bg-blue-500' };
      case 'E-Wallet': return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800', icon: <Smartphone size={14} />, cardBorder: 'border-2 border-green-200 dark:border-green-900/50', dot: 'bg-green-500' };
      case 'Cash':     return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', icon: <Banknote size={14} />, cardBorder: 'border-2 border-amber-200 dark:border-amber-900/50', dot: 'bg-amber-500' };
      default:         return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', icon: <CreditCard size={14} />, cardBorder: 'border-2 border-border', dot: 'bg-slate-400' };
    }
  };

  const handleOpenDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({ name: account.name, type: account.type, balance: account.balance });
      setBalanceDisplay(account.balance > 0 ? formatBalanceDisplay(account.balance) : '');
    } else {
      setEditingAccount(null);
      setFormData({ name: '', type: 'Bank', balance: 0 });
      setBalanceDisplay('');
    }
    setBalanceError('');
    setIsDialogOpen(true);
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = handleBalanceKeyInput(e.target.value);
    const numeric   = parseBalanceInput(formatted);
    if (numeric > MAX_BALANCE) {
      setBalanceError('Maximum balance is Rp 1.000.000.000');
      setFormData({ ...formData, balance: MAX_BALANCE });
      setBalanceDisplay(formatBalanceDisplay(MAX_BALANCE));
      return;
    }
    setBalanceError('');
    setFormData({ ...formData, balance: numeric });
    setBalanceDisplay(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (balanceError) return;

    if (editingAccount && formData.balance !== editingAccount.balance) {
      const diff = formData.balance - editingAccount.balance;
      const newBalance = formData.balance;
      const snapshotAccount = editingAccount;
      const snapshotForm = { ...formData };

      const doSubmit = async () => {
        setSubmitting(true);
        try {
          const { success, error } = await updateAccountWithAdjustment(
            snapshotAccount.id,
            snapshotForm,
            snapshotAccount.balance
          );
          if (success) toast.success('Account updated & adjustment recorded!');
          else toast.error(error || 'Failed to update account');
        } finally {
          setSubmitting(false);
        }
      };

      setIsDialogOpen(false);
      setTimeout(() => {
        setAdjustConfirm({ open: true, diff, newBalance, pendingSubmit: doSubmit });
      }, 150);
      return;
    }

    setSubmitting(true);
    try {
      if (editingAccount) {
        const { success, error } = await updateAccount(editingAccount.id, formData);
        if (success) { setIsDialogOpen(false); toast.success('Account updated!'); }
        else toast.error(error || 'Failed to update account');
      } else {
        const { success, error } = await createAccount(formData);
        if (success) { setIsDialogOpen(false); toast.success('Account created!'); }
        else toast.error(error || 'Failed to create account');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrimary = async (e: React.MouseEvent, account: Account) => {
    e.stopPropagation();
    if (account.is_primary) return;
    setSettingPrimaryId(account.id);
    const { success, error } = await setPrimaryAccount(account.id);
    if (success) toast.success(`${account.name} set as primary account`);
    else toast.error(error || 'Failed to set primary account');
    setSettingPrimaryId(null);
  };

  // ✅ FIX: closeConfirm() selalu dipanggil setelah delete, sukses maupun gagal
  const handleDelete = (id: string, name: string) => {
    setConfirmState({
      open: true,
      accountName: name,
      onConfirm: async () => {
        closeConfirm();
        const { success, error } = await deleteAccount(id);
        if (success) toast.success('Account deleted');
        else toast.error(error || 'Failed to delete account');
      },
    });
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const primaryAccount = accounts.find(a => a.is_primary);

  if (loading) return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <ListPageSkeleton rows={3} />
      </div>
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
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="name">Account Name</Label>
                      <span className={`text-xs ${formData.name.length >= MAX_NAME ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {formData.name.length}/{MAX_NAME}
                      </span>
                    </div>
                    <Input id="name" value={formData.name}
                      onChange={(e) => { if (e.target.value.length <= MAX_NAME) setFormData({ ...formData, name: e.target.value }); }}
                      placeholder="e.g. BCA Main, GoPay" maxLength={MAX_NAME} required />
                  </div>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="balance">
                        {editingAccount ? 'Balance' : 'Initial Balance'}
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Gunakan <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border">,</kbd> untuk desimal
                      </span>
                    </div>
                    {editingAccount && formData.balance !== editingAccount.balance && (
                      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md border ${
                        formData.balance > editingAccount.balance
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                      }`}>
                        {formData.balance > editingAccount.balance
                          ? <ArrowUpCircle size={14} />
                          : <ArrowDownCircle size={14} />
                        }
                        <span>
                          Selisih <strong>{formatCurrency(Math.abs(formData.balance - editingAccount.balance))}</strong>
                          {' '}akan dicatat sebagai transaksi penyesuaian
                        </span>
                      </div>
                    )}
                    <div className={`flex rounded-md border overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${balanceError ? 'border-destructive' : 'border-input'}`}>
                      <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-input select-none">Rp</span>
                      <Input
                        id="balance"
                        type="text"
                        inputMode="decimal"
                        value={balanceDisplay}
                        onChange={handleBalanceChange}
                        placeholder="0"
                        required
                        className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    {balanceError && <p className="text-xs text-destructive">{balanceError}</p>}
                    <p className="text-xs text-muted-foreground">
                      Contoh: <span className="font-mono">300.010,50</span> untuk Rp 300.010,50 · Maks: Rp 1.000.000.000
                    </p>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={submitting}>
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editingAccount ? 'Update Account' : 'Save Account'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Card */}
          <Card className="bg-primary text-primary-foreground border-0 shadow-lg rounded-xl">
            <CardContent className="pt-5 pb-5 px-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 opacity-80 mb-1">
                    <Wallet size={15} />
                    <span className="text-xs font-semibold uppercase tracking-widest">Total Balance</span>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs opacity-60">{accounts.length} Account{accounts.length !== 1 ? 's' : ''}</p>
                    {primaryAccount && (
                      <span className="flex items-center gap-1 text-xs opacity-75">
                        <Star size={10} className="fill-current" />
                        {primaryAccount.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="opacity-10 hidden md:block"><Wallet size={56} /></div>
              </div>
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
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">{item.icon}</div>
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

          {/* Account Cards */}
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
                const isPrimary = !!account.is_primary;
                const isSettingThis = settingPrimaryId === account.id;

                return (
                  <Card
                    key={account.id}
                    className={`hover:shadow-lg transition-all bg-white dark:bg-card cursor-pointer ${
                      isPrimary
                        ? 'border-2 border-amber-400 dark:border-amber-500'
                        : cfg.cardBorder
                    }`}
                    onClick={() => navigate(`/transactions?accountId=${account.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.icon}{account.type}
                          </span>
                          {isPrimary && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                              <Star size={10} className="fill-current" /> Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0" onClick={e => e.stopPropagation()}>
                          {!isPrimary && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-amber-500"
                              title="Set as primary account"
                              onClick={(e) => handleSetPrimary(e, account)}
                              disabled={isSettingThis}>
                              {isSettingThis
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Star size={13} />
                              }
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleOpenDialog(account)}>
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-red-500 hover:text-white"
                            onClick={() => handleDelete(account.id, account.name)}
                            disabled={isPrimary && accounts.length === 1}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-tight mb-3">{account.name}</p>
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

          {accounts.length > 1 && (
            <p className="text-xs text-muted-foreground/60 text-center">
              Tap <Star size={10} className="inline" /> on an account to set it as the default for new transactions
            </p>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title="Delete Account?"
        description={`"${confirmState.accountName}" will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        icon={<Trash2 size={20} />}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Confirm Balance Adjustment Dialog */}
      <ConfirmDialog
        open={adjustConfirm.open}
        title="Catat Penyesuaian Saldo?"
        description={
          adjustConfirm.diff > 0
            ? `Saldo bertambah ${formatCurrency(adjustConfirm.diff)}. Perubahan ini akan dicatat sebagai transaksi income (penyesuaian) secara otomatis.`
            : `Saldo berkurang ${formatCurrency(Math.abs(adjustConfirm.diff))}. Perubahan ini akan dicatat sebagai transaksi expense (penyesuaian) secara otomatis.`
        }
        confirmLabel="Ya, Simpan & Catat"
        variant="default"
        icon={adjustConfirm.diff > 0 ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
        onConfirm={async () => {
          setAdjustConfirm(prev => ({ ...prev, open: false }));
          if (adjustConfirm.pendingSubmit) await adjustConfirm.pendingSubmit();
        }}
        onCancel={() => setAdjustConfirm({ open: false, diff: 0, newBalance: 0, pendingSubmit: null })}
      />
    </div>
  );
}