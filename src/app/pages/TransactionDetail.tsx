// src/app/pages/TransactionDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { usePendingAttachments } from '../hooks/usePendingAttachments';
import { PendingAttachmentPicker } from '../components/PendingAttachmentPicker';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  ChevronLeft, X, Loader2, FileText, Image as ImageIcon,
  Save, AlertCircle, AlertTriangle, TrendingUp, TrendingDown,
} from 'lucide-react';
import { formatFileSize, isImageFile } from '../../lib/supabase';

const MAX_AMOUNT = 1_000_000_000;
const MAX_DESC   = 10_000;

function formatAmountDisplay(value: number): string {
  if (!value || value === 0) return '';
  return value.toLocaleString('id-ID');
}

function parseAmountInput(display: string): number {
  return Number(display.replace(/\./g, '').replace(/,/g, '')) || 0;
}

function handleAmountKeyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export function TransactionDetail() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const params    = useParams();

  const idFromParams = params.id;
  const idFromUrl    = location.pathname.split('/transactions/')[1];
  const id           = idFromParams || idFromUrl;
  const isNew        = id === 'new' || !id;

  const { getTransactionById, createTransaction, updateTransaction } = useTransactions();
  const { accounts }                            = useAccounts();
  const { categories, getCategoriesBySubtype }  = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();

  const {
    pendingFiles, addFiles,
    removeFile: removePendingFile,
    uploadAllPending,
    isUploading: isUploadingPending,
  } = usePendingAttachments();

  const transaction        = isNew ? null : getTransactionById(id!);
  const originalAcctDeleted = !isNew && transaction && transaction.accountId === null;

  const [amountDisplay, setAmountDisplay] = useState('');
  const [formData, setFormData] = useState({
    accountId:   '',
    amount:      0,
    type:        '' as 'income' | 'expense' | '',
    date:        new Date().toISOString().split('T')[0],
    categoryId:  '',
    description: '',
  });
  const [attachments, setAttachments]   = useState<any[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [amountError, setAmountError]   = useState('');

  const displayCategories = useMemo(
    () => formData.type ? getCategoriesBySubtype(formData.type as 'income' | 'expense') : [],
    [formData.type, categories],
  );

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const isOverBalance   =
    formData.type === 'expense' &&
    formData.accountId !== '' &&
    formData.amount > 0 &&
    selectedAccount !== undefined &&
    formData.amount > selectedAccount.balance;

  useEffect(() => {
    if (!isNew && transaction) {
      setFormData({
        accountId:   transaction.accountId || '',
        amount:      transaction.amount,
        type:        transaction.type,
        date:        transaction.date,
        categoryId:  transaction.categoryId,
        description: transaction.description || '',
      });
      setAmountDisplay(formatAmountDisplay(transaction.amount));
    }
  }, [isNew, transaction?.id]);

  useEffect(() => {
    if (!isNew && id) loadAttachments();
  }, [id]);

  const loadAttachments = async () => {
    if (!id) return;
    const { data } = await getAttachments('transaction', id);
    if (data) setAttachments(data);
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return 'Deleted Account';
    return accounts.find(a => a.id === accountId)?.name ?? 'Deleted Account';
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = handleAmountKeyInput(e.target.value);
    const numeric   = parseAmountInput(formatted);
    if (numeric > MAX_AMOUNT) {
      setAmountError('Maximum amount is Rp 1,000,000,000');
      setAmountDisplay(MAX_AMOUNT.toLocaleString('id-ID'));
      setFormData(prev => ({ ...prev, amount: MAX_AMOUNT }));
      return;
    }
    setAmountError('');
    setAmountDisplay(formatted);
    setFormData(prev => ({ ...prev, amount: numeric }));
  };

  const handleTypeChange = (v: 'income' | 'expense') => {
    setFormData(prev => ({ ...prev, type: v, categoryId: '' }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const { success, data, error } = await uploadAttachment(files[i], 'transaction', id);
      if (success && data) setAttachments(prev => [...prev, data]);
      else alert(error || 'Failed to upload file');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string, url: string) => {
    if (!confirm('Remove this attachment?')) return;
    const { success, error } = await deleteAttachment(attachmentId, url);
    if (success) setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    else alert(error || 'Failed to delete attachment');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId) return alert('Please select an account.');
    if (!formData.amount || formData.amount <= 0) return alert('Please enter a valid amount.');
    if (!formData.type) return alert('Please select a transaction type.');
    if (!formData.categoryId) return alert('Please select a category.');
    if (formData.type === 'expense' && selectedAccount && formData.amount > selectedAccount.balance)
      return alert(`Insufficient balance!\n\nAccount: ${selectedAccount.name}\nBalance: ${fmt(selectedAccount.balance)}\nExpense: ${fmt(formData.amount)}`);

    setSubmitting(true);
    try {
      if (isNew) {
        const { success, data, error } = await createTransaction(formData as any);
        if (!success || !data) { alert(error || 'Failed to create transaction'); return; }
        if (pendingFiles.length > 0) {
          const { error: uploadError } = await uploadAllPending('transaction', data.id);
          if (uploadError) alert(`Transaction saved, but some attachments failed:\n${uploadError}`);
        }
        showToast('Transaction saved!');
        setTimeout(() => navigate('/transactions'), 800);
      } else {
        if (!id || id === 'new') { alert('Invalid transaction ID'); return; }
        const { success, error } = await updateTransaction(id, formData as any);
        if (success) {
          showToast('Transaction updated!');
          setTimeout(() => navigate('/transactions'), 800);
        } else alert(error || 'Failed to update transaction');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy       = submitting || isUploadingPending;
  const typeSelected = formData.type !== '';
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={16} />
              Back to Transactions
            </button>
          </div>

          {/* ── Deleted account warning ── */}
          {originalAcctDeleted && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
              <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                The account linked to this transaction has been <strong>deleted</strong>. History is still saved.
                Select a new account below to edit.
              </p>
            </div>
          )}

          {/* ── Toast notification ── */}
          {toast && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M12.5 3.5L6 10L2.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {toast}
            </div>
          )}

          {/* ── Main form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className={`bg-white dark:bg-card shadow-sm rounded-xl border-2 ${
              formData.type === 'income'  ? 'border-green-300 dark:border-green-800' :
              formData.type === 'expense' ? 'border-red-300 dark:border-red-800' :
              'border-slate-200 dark:border-border'
            }`}>
              <CardContent className="pt-4 pb-4 px-4 space-y-4">

                {/* Account + Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="account">Account <span className="text-destructive">*</span></Label>
                    {originalAcctDeleted && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground italic mb-1">
                        <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                        Previously linked to deleted account
                      </div>
                    )}
                    <Select value={formData.accountId} onValueChange={(v) => setFormData({ ...formData, accountId: v })}>
                      <SelectTrigger id="account">
                        {selectedAccount ? (
                          <div className="flex items-center justify-between w-full pr-1">
                            <span>{selectedAccount.name}</span>
                            <span className={`text-xs font-medium ml-2 ${isOverBalance ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                              {fmt(selectedAccount.balance)}
                            </span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select account" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none select-none">Rp</span>
                    <Input
                      id="amount" type="text" inputMode="numeric" placeholder=""
                      value={amountDisplay}
                      onChange={handleAmountChange}
                      className={`pl-9 font-semibold ${isOverBalance ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                  </div>
                  {amountError && <p className="text-xs text-destructive">{amountError}</p>}
                  {isOverBalance && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle size={12} />
                      <span>Exceeds balance. Shortfall: {fmt(formData.amount - selectedAccount!.balance)}</span>
                    </div>
                  )}
                </div>

                {/* Type + Category — side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
                    <Select value={formData.type} onValueChange={(v) => handleTypeChange(v as 'income' | 'expense')}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">
                          <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-green-600" />
                            <span>Income</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="expense">
                          <div className="flex items-center gap-2">
                            <TrendingDown size={14} className="text-red-600" />
                            <span>Expense</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                    <Select
                      key={formData.type}
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                      disabled={!typeSelected}
                    >
                      <SelectTrigger id="category" className={!typeSelected ? 'opacity-50 cursor-not-allowed' : ''}>
                        {formData.categoryId ? (
                          (() => {
                            const cat = displayCategories.find(c => c.id === formData.categoryId);
                            return cat ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                <span>{cat.name}</span>
                              </div>
                            ) : <SelectValue placeholder="Select category" />;
                          })()
                        ) : (
                          <SelectValue placeholder={typeSelected ? 'Select category' : 'Select type first'} />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {displayCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                              <span>{cat.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description">
                      Description <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
                    </Label>
                    <span className={`text-xs ${formData.description.length >= MAX_DESC ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {formData.description.length.toLocaleString('id-ID')}/{MAX_DESC.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Add a note about this transaction..."
                    value={formData.description}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_DESC)
                        setFormData({ ...formData, description: e.target.value });
                    }}
                    maxLength={MAX_DESC} rows={3}
                  />
                </div>

                {/* Pending attachments — new transaction only */}
                {isNew && (
                  <PendingAttachmentPicker
                    pendingFiles={pendingFiles}
                    onAddFiles={addFiles}
                    onRemoveFile={removePendingFile}
                    isUploading={isUploadingPending}
                    disabled={isBusy}
                  />
                )}
              </CardContent>
            </Card>

            {/* ── Attachments — existing transaction ── */}
            {!isNew && (
              <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
                <CardContent className="pt-4 pb-4 px-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Attachments</p>
                  <div className="space-y-1.5">
                    <Input type="file" accept="image/*,application/pdf" multiple
                      onChange={handleFileUpload} disabled={uploading} />
                    <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, PDF — max 10MB per file</p>
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                      </div>
                    )}
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isImageFile(file.name)
                              ? <ImageIcon size={16} className="text-primary flex-shrink-0" />
                              : <FileText size={16} className="text-red-500 flex-shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            <a href={file.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex-shrink-0 mr-2">View</a>
                          </div>
                          <Button type="button" variant="ghost" size="icon"
                            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteAttachment(file.id, file.url)}>
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Summary — existing transaction ── */}
            {!isNew && transaction && (
              <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
                <CardContent className="pt-4 pb-4 px-4 space-y-2.5">
                  <p className="text-sm font-semibold text-foreground mb-1">Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account</span>
                    <span className={`font-medium ${!transaction.accountId ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                      {getAccountName(transaction.accountId)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-foreground font-medium">
                      {new Date(transaction.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                      {transaction.type === 'income' ? 'Income' : 'Expense'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className={`font-semibold ${
                      transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{fmt(transaction.amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Save button ── */}
            <Button type="submit" className="w-full gap-2" disabled={isBusy || isOverBalance}>
              {isBusy
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {isUploadingPending ? 'Uploading...' : 'Saving...'}</>
                : <><Save size={15} /> {isNew ? 'Save Transaction' : 'Update Transaction'}</>
              }
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}