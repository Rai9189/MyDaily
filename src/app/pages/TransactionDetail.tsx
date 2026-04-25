// src/app/pages/TransactionDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { usePendingAttachments } from '../hooks/usePendingAttachments';
import { PendingAttachmentPicker } from '../components/PendingAttachmentPicker';
import { RichTextEditor, stripHtml } from '../components/RichTextEditor';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  ChevronLeft, X, Loader2, FileText, Image as ImageIcon,
  Save, AlertCircle, AlertTriangle, TrendingUp, TrendingDown,
} from 'lucide-react';
import { CategorySelect } from '../components/CategorySelect';
import { formatFileSize, isImageFile } from '../../lib/supabase';
import { toast } from 'sonner';
import { DetailPageSkeleton } from '../components/Skeletons';

const MAX_AMOUNT = 1_000_000_000;
const MAX_DESC   = 10_000;

// ✅ Format angka untuk tampilan: pisahkan ribuan pakai titik, desimal pakai koma
// Contoh: 300010.5 → "300.010,5"  |  300000 → "300.000"
function formatAmountDisplay(value: number): string {
  if (!value || value === 0) return '';
  // Pisahkan integer dan desimal
  const [intPart, decPart] = value.toString().split('.');
  const formattedInt = Number(intPart).toLocaleString('id-ID');
  return decPart ? `${formattedInt},${decPart}` : formattedInt;
}

// ✅ Parse input display (dengan titik ribuan & koma desimal) → number
// Contoh: "300.010,50" → 300010.50  |  "300.000" → 300000
function parseAmountInput(display: string): number {
  // Hapus titik (pemisah ribuan), ganti koma (desimal) dengan titik
  const normalized = display.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

// ✅ Handler saat user mengetik — support desimal opsional
// Aturan:
//   - Hanya boleh digit, titik (.), dan koma (,)
//   - Titik = pemisah ribuan (otomatis diformat ulang)
//   - Koma = pemisah desimal (max 2 digit setelah koma)
//   - Jika user sedang mengetik desimal (diakhiri koma / koma+digit), jangan reformat dulu
function handleAmountKeyInput(raw: string): string {
  // Izinkan karakter valid saja: digit, koma, titik
  const cleaned = raw.replace(/[^\d.,]/g, '');

  // Deteksi apakah user sedang mengetik bagian desimal
  const hasComma    = cleaned.includes(',');
  const commaIndex  = cleaned.indexOf(',');
  const afterComma  = hasComma ? cleaned.slice(commaIndex + 1) : '';

  // Jika ada lebih dari satu koma, tolak karakter terakhir
  if ((cleaned.match(/,/g) || []).length > 1) return raw.slice(0, -1);

  // Batasi desimal maksimal 2 digit
  if (hasComma && afterComma.length > 2) return raw.slice(0, -1);

  // Ambil bagian integer (sebelum koma) — hapus semua titik dulu
  const intRaw = hasComma ? cleaned.slice(0, commaIndex).replace(/\./g, '') : cleaned.replace(/\./g, '');

  if (!intRaw && !hasComma) return '';

  // Format ulang bagian integer dengan titik ribuan
  const formattedInt = intRaw ? Number(intRaw).toLocaleString('id-ID') : '0';

  // Jika user masih mengetik desimal (koma di akhir, atau koma + digit belum lengkap)
  if (hasComma) {
    return `${formattedInt},${afterComma}`;
  }

  return formattedInt;
}

// ✅ fmt: tampilkan desimal hanya jika ada
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

export function TransactionDetail() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const params    = useParams();

  const idFromParams = params.id;
  const idFromUrl    = location.pathname.split('/transactions/')[1];
  const id           = idFromParams || idFromUrl;
  const isNew        = id === 'new' || !id;

  const { transactions, loading: txLoading, getTransactionById, createTransaction, updateTransaction } = useTransactions();
  const { accounts }   = useAccounts();
  const { categories } = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();
  const { pendingFiles, addFiles, removeFile: removePendingFile, uploadAllPending, isUploading: isUploadingPending } = usePendingAttachments();

  const transaction         = isNew ? null : getTransactionById(id!);
  const originalAcctDeleted = !isNew && transaction && transaction.accountId === null;

  const [amountDisplay, setAmountDisplay] = useState('');
  const [formData, setFormData] = useState({
    accountId: '', amount: 0, type: '' as 'income' | 'expense' | '',
    date: new Date().toISOString().split('T')[0], categoryId: '', subcategoryId: null as string | null, description: '',
  });
  const [attachments, setAttachments]       = useState<any[]>([]);
  const [attachsLoading, setAttachsLoading] = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [amountError, setAmountError]       = useState('');

  const allCategoriesForType = useMemo(() => {
    if (!formData.type) return [];
    const parents = categories.filter(c => c.type === 'transaction' && !c.parentId && c.subtype === formData.type);
    const parentIds = new Set(parents.map(p => p.id));
    const subs = categories.filter(c => c.type === 'transaction' && c.parentId != null && parentIds.has(c.parentId));
    return [...parents, ...subs];
  }, [formData.type, categories]);

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const isOverBalance   = formData.type === 'expense' && formData.accountId !== '' && formData.amount > 0
    && selectedAccount !== undefined && formData.amount > selectedAccount.balance;

  const isBusy       = submitting || isUploadingPending;
  const typeSelected = formData.type !== '';
  const descLength   = stripHtml(formData.description).length;

  useEffect(() => {
    if (!isNew && transaction) {
      setFormData({
        accountId: transaction.accountId || '', amount: transaction.amount, type: transaction.type,
        date: transaction.date, categoryId: transaction.categoryId,
        subcategoryId: transaction.subcategoryId ?? null, description: transaction.description || '',
      });
      setAmountDisplay(formatAmountDisplay(transaction.amount));
    }
  }, [isNew, transaction?.id]);

  useEffect(() => {
    if (!isNew && id) loadAttachments();
  }, [id]);

  const loadAttachments = async () => {
    if (!id) return;
    setAttachsLoading(true);
    const { data } = await getAttachments('transaction', id);
    if (data) setAttachments(data);
    setAttachsLoading(false);
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return 'Deleted Account';
    return accounts.find(a => a.id === accountId)?.name ?? 'Deleted Account';
  };

  // ✅ Handler input amount — support desimal opsional
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = handleAmountKeyInput(e.target.value);
    const numeric   = parseAmountInput(formatted);

    if (numeric > MAX_AMOUNT) {
      setAmountError('Maximum amount is Rp 1.000.000.000');
      const maxDisplay = formatAmountDisplay(MAX_AMOUNT);
      setAmountDisplay(maxDisplay);
      setFormData(prev => ({ ...prev, amount: MAX_AMOUNT }));
      return;
    }

    setAmountError('');
    setAmountDisplay(formatted);
    setFormData(prev => ({ ...prev, amount: numeric }));
  };

  const handleTypeChange = (v: 'income' | 'expense') => {
    setFormData(prev => ({ ...prev, type: v, categoryId: '', subcategoryId: null }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;
    setUploading(true);
    const loadingToast = toast.loading('Uploading...');
    for (let i = 0; i < files.length; i++) {
      const { success, data, error } = await uploadAttachment(files[i], 'transaction', id);
      if (success && data) setAttachments(prev => [...prev, data]);
      else toast.error(error || 'Failed to upload file');
    }
    toast.dismiss(loadingToast);
    toast.success('Upload complete');
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string, url: string) => {
    if (!confirm('Remove this attachment?')) return;
    const { success, error } = await deleteAttachment(attachmentId, url);
    if (success) {
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success('Attachment removed');
    } else {
      toast.error(error || 'Failed to delete attachment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId)                        { toast.warning('Please select an account.'); return; }
    if (!formData.amount || formData.amount <= 0)   { toast.warning('Please enter a valid amount.'); return; }
    if (!formData.type)                             { toast.warning('Please select a transaction type.'); return; }
    if (!formData.categoryId)                       { toast.warning('Please select a category.'); return; }
    if (formData.type === 'expense' && selectedAccount && formData.amount > selectedAccount.balance) {
      toast.error(`Insufficient balance! Account: ${selectedAccount.name} · Balance: ${fmt(selectedAccount.balance)} · Expense: ${fmt(formData.amount)}`);
      return;
    }
    setSubmitting(true);
    try {
      if (isNew) {
        const { success, data, error } = await createTransaction(formData as any);
        if (!success || !data) { toast.error(error || 'Failed to create transaction'); return; }
        if (pendingFiles.length > 0) {
          const { error: uploadError } = await uploadAllPending('transaction', data.id);
          if (uploadError) toast.warning('Transaction saved, but some attachments failed.');
        }
        toast.success('Transaction saved!');
        navigate('/transactions');
      } else {
        if (!id || id === 'new') { toast.error('Invalid transaction ID'); return; }
        const { success, error } = await updateTransaction(id, formData as any);
        if (success) toast.success('Transaction updated!');
        else toast.error(error || 'Failed to update transaction');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isNew && txLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <DetailPageSkeleton fields={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/transactions')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} /> Back to Transactions
            </button>
          </div>

          {/* Deleted account warning */}
          {originalAcctDeleted && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
              <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                The account linked to this transaction has been <strong>deleted</strong>. History is still saved. Select a new account below to edit.
              </p>
            </div>
          )}

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
                        ) : <SelectValue placeholder="Select account" />}
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amount">
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    {/* ✅ Hint desimal opsional */}
                    <span className="text-[11px] text-muted-foreground">
                      Gunakan <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border">,</kbd> untuk desimal&nbsp;
                      <span className="opacity-60">(contoh: 300.010,50)</span>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none select-none">Rp</span>
                    <Input
                      id="amount"
                      type="text"
                      inputMode="decimal"
                      value={amountDisplay}
                      onChange={handleAmountChange}
                      placeholder="0"
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

                {/* Type + Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
                    <Select value={formData.type} onValueChange={(v) => handleTypeChange(v as 'income' | 'expense')}>
                      <SelectTrigger id="type"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">
                          <div className="flex items-center gap-2"><TrendingUp size={14} className="text-green-600" /><span>Income</span></div>
                        </SelectItem>
                        <SelectItem value="expense">
                          <div className="flex items-center gap-2"><TrendingDown size={14} className="text-red-600" /><span>Expense</span></div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                    <CategorySelect id="category" categories={allCategoriesForType}
                      value={formData.subcategoryId || formData.categoryId}
                      onChange={(categoryId, subcategoryId) => setFormData(prev => ({ ...prev, categoryId, subcategoryId }))}
                      placeholder={typeSelected ? 'Select category' : 'Select type first'}
                      disabled={!typeSelected}
                      className={!typeSelected ? 'opacity-50 cursor-not-allowed' : ''} />
                  </div>
                </div>

                {/* Rich Text Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label>Description <span className="text-muted-foreground font-normal text-xs">(Optional)</span></Label>
                    <span className={`text-xs ${descLength >= MAX_DESC ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {descLength.toLocaleString('id-ID')}/{MAX_DESC.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(html) => {
                      if (stripHtml(html).length <= MAX_DESC) {
                        setFormData(prev => ({ ...prev, description: html }));
                      }
                    }}
                    placeholder="Add a note about this transaction..."
                    maxLength={MAX_DESC}
                    minHeight={100}
                  />
                </div>

                {isNew && (
                  <PendingAttachmentPicker pendingFiles={pendingFiles} onAddFiles={addFiles}
                    onRemoveFile={removePendingFile} isUploading={isUploadingPending} disabled={isBusy} />
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            {!isNew && (
              <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
                <CardContent className="pt-4 pb-4 px-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Attachments</p>
                  <div className="space-y-1.5">
                    <Input type="file" accept="image/*,application/pdf" multiple onChange={handleFileUpload} disabled={uploading} />
                    <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, PDF — max 10MB per file</p>
                  </div>
                  {attachsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded-lg" />)}
                    </div>
                  ) : attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isImageFile(file.name) ? <ImageIcon size={16} className="text-primary flex-shrink-0" /> : <FileText size={16} className="text-red-500 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-shrink-0 mr-2">View</a>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
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

            {/* Summary */}
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
                    <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{fmt(transaction.amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

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