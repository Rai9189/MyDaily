// src/app/pages/TransactionDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { usePendingAttachments } from '../hooks/usePendingAttachments';
import { PendingAttachmentPicker } from '../components/PendingAttachmentPicker';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, X, Loader2, FileText, Image as ImageIcon, Save, AlertCircle, AlertTriangle } from 'lucide-react';
import { formatFileSize, isImageFile } from '../../lib/supabase';

const MAX_AMOUNT = 1_000_000_000;
const MAX_DESC = 10_000;

function formatAmountDisplay(value: number): string {
  if (!value || value === 0) return '';
  return value.toLocaleString('id-ID');
}

function parseAmountInput(display: string): number {
  const cleaned = display.replace(/\./g, '').replace(/,/g, '');
  return Number(cleaned) || 0;
}

function handleAmountKeyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

export function TransactionDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const idFromParams = params.id;
  const idFromUrl = location.pathname.split('/transactions/')[1];
  const id = idFromParams || idFromUrl;
  const isNew = id === 'new' || !id;

  const { getTransactionById, createTransaction, updateTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories, getCategoriesBySubtype } = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();

  const {
    pendingFiles, addFiles,
    removeFile: removePendingFile,
    uploadAllPending,
    isUploading: isUploadingPending,
  } = usePendingAttachments();

  const transaction = isNew ? null : getTransactionById(id!);

  // ✅ Deteksi apakah akun transaksi ini sudah dihapus
  const originalAccountDeleted =
    !isNew &&
    transaction &&
    transaction.accountId === null;

  const [amountDisplay, setAmountDisplay] = useState<string>('');
  const [formData, setFormData] = useState({
    accountId: '',
    amount: 0,
    type: '' as 'income' | 'expense' | '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    description: '',
  });

  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState('');

  const displayCategories = useMemo(
    () => formData.type ? getCategoriesBySubtype(formData.type as 'income' | 'expense') : [],
    [formData.type, categories]
  );

  const selectedAccount = accounts.find(a => a.id === formData.accountId);

  const isOverBalance =
    formData.type === 'expense' &&
    formData.accountId !== '' &&
    formData.amount > 0 &&
    selectedAccount !== undefined &&
    formData.amount > selectedAccount.balance;

  useEffect(() => {
    if (!isNew && transaction) {
      setFormData({
        accountId: transaction.accountId || '', // ✅ null → '' agar Select tidak error
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        categoryId: transaction.categoryId,
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return 'Deleted Account';
    return accounts.find(a => a.id === accountId)?.name ?? 'Deleted Account';
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = handleAmountKeyInput(e.target.value);
    const numeric = parseAmountInput(formatted);
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
    if (formData.type === 'expense' && selectedAccount && formData.amount > selectedAccount.balance) {
      return alert(
        `Insufficient balance!\n\nAccount: ${selectedAccount.name}\nBalance: ${formatCurrency(selectedAccount.balance)}\nExpense: ${formatCurrency(formData.amount)}`
      );
    }

    setSubmitting(true);
    try {
      if (isNew) {
        const { success, data, error } = await createTransaction(formData as any);
        if (!success || !data) { alert(error || 'Failed to create transaction'); return; }
        if (pendingFiles.length > 0) {
          const { error: uploadError } = await uploadAllPending('transaction', data.id);
          if (uploadError) alert(`Transaction saved, but some attachments failed:\n${uploadError}`);
        }
        navigate('/transactions');
      } else {
        if (!id || id === 'new') { alert('Invalid transaction ID'); return; }
        const { success, error } = await updateTransaction(id, formData as any);
        if (success) navigate('/transactions');
        else alert(error || 'Failed to update transaction');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = submitting || isUploadingPending;
  const typeSelected = formData.type !== '';

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/transactions')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            {isNew ? 'New Transaction' : 'Transaction Detail'}
          </h1>
          <p className="text-muted-foreground mt-0.5">
            {isNew ? 'Record a new transaction' : 'View or edit this transaction'}
          </p>
        </div>
      </div>

      {/* ✅ Warning banner — muncul jika akun asal sudah dihapus */}
      {originalAccountDeleted && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            The account linked to this transaction has been <strong>deleted</strong>. The transaction history is still saved.
            To edit this transaction, please select a new account below.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Transaction Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">

            {/* Account */}
            <div className="space-y-1.5">
              <Label htmlFor="account">Account <span className="text-destructive">*</span></Label>

              {/* ✅ Tampilkan info "Deleted Account" sebagai hint sebelum dropdown */}
              {originalAccountDeleted && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border text-sm text-muted-foreground italic mb-1">
                  <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                  Previously linked to a deleted account — please select a new one
                </div>
              )}

              <Select value={formData.accountId} onValueChange={(v) => setFormData({ ...formData, accountId: v })}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span>{acc.name}</span>
                        <span className="text-xs text-muted-foreground">{formatCurrency(acc.balance)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none select-none">Rp</span>
                <Input
                  id="amount" type="text" inputMode="numeric" placeholder="0"
                  value={amountDisplay} onChange={handleAmountChange}
                  className={`pl-9 ${isOverBalance ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                />
              </div>
              {amountError && (
                <p className="text-xs text-destructive">{amountError}</p>
              )}
              <p className="text-xs text-muted-foreground">Maximum: Rp 1,000,000,000</p>
              {isOverBalance && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle size={13} />
                  <span>
                    Amount exceeds account balance ({formatCurrency(selectedAccount!.balance)}).
                    Shortfall: {formatCurrency(formData.amount - selectedAccount!.balance)}
                  </span>
                </div>
              )}
            </div>

            {/* Transaction Type */}
            <div className="space-y-1.5">
              <Label htmlFor="type">Transaction Type <span className="text-destructive">*</span></Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
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
                  <SelectValue placeholder={typeSelected ? 'Select category' : 'Select transaction type first'} />
                </SelectTrigger>
                <SelectContent>
                  {displayCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <span className={`text-xs ${formData.description.length >= MAX_DESC ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {formData.description.length.toLocaleString('id-ID')}/{MAX_DESC.toLocaleString('id-ID')}
                </span>
              </div>
              <Textarea id="description" placeholder="Add a note about this transaction..."
                value={formData.description}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DESC)
                    setFormData({ ...formData, description: e.target.value });
                }}
                maxLength={MAX_DESC}
                rows={3} />
            </div>

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

        {/* Attachments (edit mode) */}
        {!isNew && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Upload File <span className="text-muted-foreground font-normal">(Max 10MB)</span></Label>
                <Input type="file" accept="image/*,application/pdf" multiple onChange={handleFileUpload} disabled={uploading} />
                <p className="text-xs text-muted-foreground">Supported: JPEG, PNG, GIF, WebP, PDF — max 10MB per file</p>
                {uploading && <div className="flex items-center gap-2 text-sm text-primary"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>}
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isImageFile(file.name)
                          ? <ImageIcon size={18} className="text-primary flex-shrink-0" />
                          : <FileText size={18} className="text-red-500 flex-shrink-0" />}
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
                        <X size={15} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary (edit mode) */}
        {!isNew && transaction && (
          <Card className="border border-border bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
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
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" className="flex-1 gap-2" disabled={isBusy || isOverBalance}>
            {isBusy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {isUploadingPending ? 'Uploading...' : 'Saving...'}</>
              : <><Save size={16} />{isNew ? 'Save Transaction' : 'Update Transaction'}</>
            }
          </Button>
        </div>
      </form>
    </div>
  );
}