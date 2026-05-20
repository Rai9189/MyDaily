// src/app/pages/TransactionDetail.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
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
  Save, AlertCircle, AlertTriangle, TrendingUp, TrendingDown, ArrowLeftRight, Star, Trash2, Receipt, Bookmark,
} from 'lucide-react';
import { useTransactionTemplates } from '../hooks/useTransactionTemplates';
import { CategorySelect } from '../components/CategorySelect';
import { formatFileSize, isImageFile } from '../../lib/supabase';
import { toast } from 'sonner';
import { DetailPageSkeleton } from '../components/Skeletons';
import { ConfirmDialog } from '../components/ConfirmDialog';

const MAX_AMOUNT = 1_000_000_000;
const MAX_DESC   = 10_000;

function formatAmountDisplay(value: number): string {
  if (!value || value === 0) return '';
  const [intPart, decPart] = value.toString().split('.');
  const formattedInt = Number(intPart).toLocaleString('id-ID');
  return decPart ? `${formattedInt},${decPart}` : formattedInt;
}

function parseAmountInput(display: string): number {
  const normalized = display.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function handleAmountKeyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const hasComma    = cleaned.includes(',');
  const commaIndex  = cleaned.indexOf(',');
  const afterComma  = hasComma ? cleaned.slice(commaIndex + 1) : '';
  if ((cleaned.match(/,/g) || []).length > 1) return raw.slice(0, -1);
  if (hasComma && afterComma.length > 2) return raw.slice(0, -1);
  const intRaw = hasComma ? cleaned.slice(0, commaIndex).replace(/\./g, '') : cleaned.replace(/\./g, '');
  if (!intRaw && !hasComma) return '';
  const formattedInt = intRaw ? Number(intRaw).toLocaleString('id-ID') : '0';
  if (hasComma) return `${formattedInt},${afterComma}`;
  return formattedInt;
}

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

  const { transactions, loading: txLoading, getTransactionById, createTransaction, createTransfer, updateTransaction, updateTransfer } = useTransactions();
  const { accounts }   = useAccounts();
  const { categories, createCategory } = useCategories();
  const { templates, saveTemplate, deleteTemplate } = useTransactionTemplates();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();
  const { pendingFiles, addFiles, removeFile: removePendingFile, uploadAllPending, isUploading: isUploadingPending } = usePendingAttachments();

  const transaction         = isNew ? null : getTransactionById(id!);
  const isTransfer          = transaction?.type === 'transfer';
  const originalAcctDeleted = !isNew && transaction && transaction.accountId === null;

  const outgoingTransfer = useMemo(() => {
    if (!transaction || transaction.toAccountId || transaction.type !== 'transfer') return null;
    if (transaction.transferPairId) {
      return transactions.find(t => t.transferPairId === transaction.transferPairId && t.id !== transaction.id) ?? null;
    }
    return transactions.find(t =>
      t.id !== transaction.id &&
      t.type === 'transfer' &&
      t.toAccountId === transaction.accountId &&
      t.amount === transaction.amount &&
      t.date === transaction.date
    ) ?? null;
  }, [transaction, transactions]);

  // ✅ Auto-select primary account saat new transaction
  const primaryAccount = useMemo(() => accounts.find(a => a.is_primary) ?? accounts[0] ?? null, [accounts]);

  const [amountDisplay, setAmountDisplay] = useState('');
  const [formData, setFormData] = useState({
    accountId: '',
    toAccountId: '',
    amount: 0,
    type: '' as 'income' | 'expense' | 'transfer' | '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    subcategoryId: null as string | null,
    description: '',
  });
  const [attachments, setAttachments]       = useState<any[]>([]);
  const [attachsLoading, setAttachsLoading] = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const submittingRef                       = useRef(false);
  const [amountError, setAmountError]       = useState('');
  const [deleteAttachTarget, setDeleteAttachTarget] = useState<{ id: string; url: string } | null>(null);
  const [deletingAttach, setDeletingAttach] = useState(false);

  // Template state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName]         = useState('');

  // Tax state
  const [taxEnabled, setTaxEnabled]           = useState(false);
  const [taxType, setTaxType]                 = useState<'percent' | 'nominal'>('percent');
  const [taxValueDisplay, setTaxValueDisplay] = useState('');
  const [taxValue, setTaxValue]               = useState(0);
  const [taxCategoryId, setTaxCategoryId]     = useState('');

  const allCategoriesForType = useMemo(() => {
    if (!formData.type || formData.type === 'transfer') return [];
    const parents = categories.filter(c => c.type === 'transaction' && !c.parentId && c.subtype === formData.type);
    const parentIds = new Set(parents.map(p => p.id));
    const subs = categories.filter(c => c.type === 'transaction' && c.parentId != null && parentIds.has(c.parentId));
    return [...parents, ...subs];
  }, [formData.type, categories]);

  const toAccountOptions   = accounts.filter(a => a.id !== formData.accountId);
  const fromAccountOptions = accounts.filter(a => a.id !== formData.toAccountId);

  const selectedAccount   = accounts.find(a => a.id === formData.accountId);
  const selectedToAccount = accounts.find(a => a.id === formData.toAccountId);

  const taxAmount = useMemo(() => {
    if (!taxEnabled || taxValue <= 0 || formData.amount <= 0) return 0;
    if (taxType === 'nominal') return taxValue;
    return Math.round((taxValue / 100) * formData.amount * 100) / 100;
  }, [taxEnabled, taxType, taxValue, formData.amount]);

  const taxNominalExceedsAmount = taxEnabled && taxType === 'nominal' && taxValue > 0 && formData.amount > 0 && taxValue > formData.amount;

  // Saat edit, saldo akun sudah mencerminkan transaksi asli.
  // Sesuaikan saldo efektif berdasarkan efek transaksi asli agar validasi akurat.
  const availableBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    if (isNew) return selectedAccount.balance;
    const sameAccount = transaction?.accountId === formData.accountId;
    if (sameAccount && transaction) {
      const wasDeducting = transaction.type === 'expense' || transaction.type === 'transfer';
      // expense/transfer: mengurangi saldo → kembalikan jumlahnya
      // income: menambah saldo → kurangi jumlahnya (agar rollback income tercermin)
      return wasDeducting
        ? selectedAccount.balance + transaction.amount
        : selectedAccount.balance - transaction.amount;
    }
    return selectedAccount.balance;
  }, [selectedAccount, isNew, transaction, formData.accountId]);

  const isOverBalance = formData.type === 'expense' && formData.accountId !== '' && formData.amount > 0
    && selectedAccount !== undefined && (formData.amount + (taxEnabled ? taxAmount : 0)) > availableBalance;

  const isTransferOverBalance = formData.type === 'transfer' && formData.accountId !== '' && formData.amount > 0
    && selectedAccount !== undefined && (formData.amount + (taxEnabled ? taxAmount : 0)) > availableBalance;

  const isBusy       = submitting || isUploadingPending;
  const typeSelected = formData.type !== '';
  const descLength   = stripHtml(formData.description).length;

  const transferCategoryId = useMemo(() => {
    const other = categories.find(c =>
      c.type === 'transaction' && !c.parentId &&
      (c.name.toLowerCase().includes('other') || c.name.toLowerCase().includes('lain'))
    );
    return other?.id ?? categories.find(c => c.type === 'transaction' && !c.parentId)?.id ?? '';
  }, [categories]);

  const defaultTaxCategory = useMemo(() =>
    categories.find(c =>
      c.type === 'transaction' && !c.parentId && c.subtype === 'expense' &&
      c.name.toLowerCase() === 'tax'
    ),
    [categories]
  );

  const expenseCategories = useMemo(() =>
    categories.filter(c => c.type === 'transaction' && !c.parentId && c.subtype === 'expense'),
    [categories]
  );

  useEffect(() => {
    if (isNew) {
      if (primaryAccount) {
        setFormData(prev => ({ ...prev, accountId: primaryAccount.id }));
      }
      return;
    }
    if (transaction) {
      let toAccId = transaction.toAccountId || '';
      if (isTransfer && !toAccId) {
        const pair = transactions.find(t =>
          t.transferPairId === transaction.transferPairId && t.id !== transaction.id
        );
        if (pair) toAccId = pair.accountId;
      }
      setFormData({
        accountId: transaction.accountId || '',
        toAccountId: toAccId,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        categoryId: transaction.categoryId,
        subcategoryId: transaction.subcategoryId ?? null,
        description: transaction.description || '',
      });
      setAmountDisplay(formatAmountDisplay(transaction.amount));
      setTaxEnabled(false);
      setTaxType('percent');
      setTaxValue(0);
      setTaxValueDisplay('');
    }
  }, [isNew, transaction?.id, primaryAccount?.id]);

  useEffect(() => {
    if (!isNew && id) loadAttachments();
  }, [id]);

  useEffect(() => {
    if (defaultTaxCategory && !taxCategoryId) {
      setTaxCategoryId(defaultTaxCategory.id);
    }
  }, [defaultTaxCategory?.id]);

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

  const handleTypeChange = (v: 'income' | 'expense' | 'transfer') => {
    setFormData(prev => ({ ...prev, type: v, categoryId: '', subcategoryId: null, toAccountId: '' }));
    setTaxEnabled(false);
    setTaxValueDisplay('');
    setTaxValue(0);
  };

  const applyTemplate = (tpl: typeof templates[0]) => {
    const accountExists  = accounts.find(a => a.id === tpl.accountId);
    const categoryExists = categories.find(c => c.id === tpl.categoryId);
    setFormData(prev => ({
      ...prev,
      ...(accountExists  ? { accountId: tpl.accountId }   : {}),
      type:          tpl.type,
      amount:        tpl.amount,
      categoryId:    categoryExists ? tpl.categoryId              : '',
      subcategoryId: categoryExists ? (tpl.subcategoryId ?? null) : null,
      description:   tpl.description || '',
    }));
    setAmountDisplay(formatAmountDisplay(tpl.amount));
    setTaxEnabled(false);
    setTaxValueDisplay('');
    setTaxValue(0);
    if (!accountExists)  toast.warning('Template account has been deleted. Account not applied.');
    if (!categoryExists) toast.warning('Template category has been deleted. Category not applied.');
    toast.success(`Template "${tpl.name}" applied!`);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !formData.type || formData.type === 'transfer') return;
    const result = await saveTemplate(templateName.trim(), {
      accountId:     formData.accountId,
      type:          formData.type as 'income' | 'expense',
      amount:        formData.amount,
      categoryId:    formData.categoryId,
      subcategoryId: formData.subcategoryId,
      description:   formData.description,
    });
    if (result) toast.success(`Template "${templateName.trim()}" saved!`);
    else toast.error('Failed to save template. Please try again.');
    setShowSaveTemplate(false);
    setTemplateName('');
  };

  const handleTaxValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (taxType === 'percent') {
      const raw = e.target.value.replace(/[^\d.]/g, '');
      const num = parseFloat(raw);
      setTaxValueDisplay(raw);
      setTaxValue(isNaN(num) ? 0 : Math.min(num, 100));
    } else {
      const formatted = handleAmountKeyInput(e.target.value);
      setTaxValueDisplay(formatted);
      setTaxValue(parseAmountInput(formatted));
    }
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

  const handleDeleteAttachment = (attachmentId: string, url: string) => {
    setDeleteAttachTarget({ id: attachmentId, url });
  };

  const doDeleteAttachment = async () => {
    if (!deleteAttachTarget) return;
    setDeletingAttach(true);
    const { success, error } = await deleteAttachment(deleteAttachTarget.id, deleteAttachTarget.url);
    if (success) {
      setAttachments(prev => prev.filter(a => a.id !== deleteAttachTarget.id));
      toast.success('Attachment removed');
    } else {
      toast.error(error || 'Failed to delete attachment');
    }
    setDeletingAttach(false);
    setDeleteAttachTarget(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId) { toast.warning('Please select an account.'); return; }
    if (!formData.amount || formData.amount <= 0) { toast.warning('Please enter a valid amount.'); return; }
    if (!formData.type) { toast.warning('Please select a transaction type.'); return; }

    if (formData.type === 'transfer') {
      if (!formData.toAccountId) { toast.warning('Please select a destination account.'); return; }
      if (formData.toAccountId === formData.accountId) { toast.warning('Source and destination accounts must be different.'); return; }
      if (accounts.length < 2) { toast.warning('You need at least 2 accounts to make a transfer.'); return; }
      if (selectedAccount && (formData.amount + taxAmount) > availableBalance) {
        const totalNeeded = formData.amount + taxAmount;
        toast.error(`Insufficient balance! ${selectedAccount.name}: ${fmt(availableBalance)} · Required: ${fmt(totalNeeded)}${taxAmount > 0 ? ` (incl. tax ${fmt(taxAmount)})` : ''}`);
        return;
      }
    } else {
      if (!formData.categoryId) { toast.warning('Please select a category.'); return; }
      if (formData.type === 'expense' && selectedAccount && (formData.amount + taxAmount) > availableBalance) {
        const totalNeeded = formData.amount + taxAmount;
        toast.error(`Insufficient balance! ${selectedAccount.name}: ${fmt(availableBalance)} · Required: ${fmt(totalNeeded)}${taxAmount > 0 ? ` (incl. tax ${fmt(taxAmount)})` : ''}`);
        return;
      }
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    // Helper: resolve tax category (auto-create "Tax" if needed) then create tax expense
    const saveTaxTransaction = async (accountId: string, date: string, description: string): Promise<boolean> => {
      if (!taxEnabled || taxAmount <= 0) return true;
      let catId = taxCategoryId;
      if (!catId) {
        const { success: ok, data: cd } = await createCategory({
          name: 'Tax', type: 'transaction', subtype: 'expense', color: '#f59e0b',
        });
        if (ok && cd) { catId = cd.id; setTaxCategoryId(cd.id); }
      }
      if (!catId) return false;
      const mainDesc = stripHtml(description).trim();
      const { success } = await createTransaction({
        accountId,
        amount: taxAmount,
        type: 'expense',
        date,
        categoryId: catId,
        subcategoryId: null,
        description: mainDesc ? `Tax from ${mainDesc}` : `Tax from transaction ${date}`,
      });
      return success;
    };

    try {
      if (isNew) {
        if (formData.type === 'transfer') {
          const { success, error } = await createTransfer({
            fromAccountId: formData.accountId,
            toAccountId: formData.toAccountId,
            amount: formData.amount,
            date: formData.date,
            description: formData.description,
            categoryId: transferCategoryId,
          });
          if (!success) { toast.error(error || 'Failed to create transfer'); return; }
          const taxOk = await saveTaxTransaction(formData.accountId, formData.date, formData.description);
          if (taxEnabled && taxAmount > 0) {
            if (taxOk) toast.success(`Transfer & tax ${fmt(taxAmount)} recorded!`);
            else toast.warning('Transfer saved, but failed to record tax.');
          } else {
            toast.success('Transfer recorded!');
          }
          navigate('/transactions');
        } else {
          const { success, data, error } = await createTransaction(formData as any);
          if (!success || !data) { toast.error(error || 'Failed to create transaction'); return; }
          if (pendingFiles.length > 0) {
            const { error: uploadError } = await uploadAllPending('transaction', data.id);
            if (uploadError) toast.warning('Transaction saved, but some attachments failed.');
          }
          const taxOk = await saveTaxTransaction(formData.accountId, formData.date, formData.description);
          if (taxEnabled && taxAmount > 0) {
            if (taxOk) toast.success(`Transaction & tax ${fmt(taxAmount)} recorded!`);
            else toast.warning('Transaction saved, but failed to record tax.');
          } else {
            toast.success('Transaction saved!');
          }
          navigate('/transactions');
        }
      } else {
        if (!id || id === 'new') { toast.error('Invalid transaction ID'); return; }
        if (formData.type === 'transfer') {
          const { success, error } = await updateTransfer(id, {
            fromAccountId: formData.accountId,
            toAccountId: formData.toAccountId,
            amount: formData.amount,
            date: formData.date,
            description: formData.description,
            categoryId: formData.categoryId || transferCategoryId,
          });
          if (success) toast.success('Transfer updated!');
          else toast.error(error || 'Failed to update transfer');
        } else {
          const { success, error } = await updateTransaction(id, formData as any);
          if (success) toast.success('Transaction updated!');
          else toast.error(error || 'Failed to update transaction');
        }
      }
    } finally {
      submittingRef.current = false;
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

  if (!isNew && !txLoading && !transaction) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-4 pb-6">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft size={16} /> Back
              </button>
            </div>
            <Card className="border-2 border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm">
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground font-medium">Transaction not found</p>
                <p className="text-sm text-muted-foreground/60 mt-1">This transaction may have been deleted or doesn't exist.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ConfirmDialog
        open={!!deleteAttachTarget}
        title="Remove Attachment?"
        description="This attachment will be permanently removed."
        confirmLabel="Remove"
        variant="danger"
        icon={<Trash2 size={20} />}
        loading={deletingAttach}
        onConfirm={doDeleteAttachment}
        onCancel={() => setDeleteAttachTarget(null)}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={16} /> Back
            </button>
          </div>

          {/* Template Bar — hanya saat new transaction */}
          {isNew && templates.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium flex-shrink-0">
                <Bookmark size={12} /> Templates:
              </span>
              {templates.map(tpl => (
                <div key={tpl.id} className="flex items-center rounded-full border border-border bg-muted/40 overflow-hidden">
                  <button type="button" onClick={() => applyTemplate(tpl)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 hover:bg-muted transition-colors max-w-[160px]">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tpl.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="truncate font-medium">{tpl.name}</span>
                    <span className="text-muted-foreground flex-shrink-0 text-[10px]">
                      {new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(tpl.amount)}
                    </span>
                  </button>
                  <button type="button" onClick={() => deleteTemplate(tpl.id)}
                    className="px-1.5 py-1 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Hapus template">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {originalAcctDeleted && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
              <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                The account linked to this transaction has been <strong>deleted</strong>. History is still saved. Select a new account below to edit.
              </p>
            </div>
          )}

          {!isNew && isTransfer && !transaction?.toAccountId && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
              <ArrowLeftRight size={15} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  This is the <strong>incoming</strong> side of a transfer. To edit or delete, open the outgoing transaction.
                </p>
                {outgoingTransfer && (
                  <button type="button"
                    onClick={() => navigate(`/transactions/${outgoingTransfer.id}`)}
                    className="mt-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1">
                    <ArrowLeftRight size={11} /> Open Outgoing Transaction →
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className={`bg-white dark:bg-card shadow-sm rounded-xl border-2 ${
              formData.type === 'income'   ? 'border-green-300 dark:border-green-800' :
              formData.type === 'expense'  ? 'border-red-300 dark:border-red-800' :
              formData.type === 'transfer' ? 'border-blue-300 dark:border-blue-800' :
              'border-slate-200 dark:border-border'
            }`}>
              <CardContent className="pt-4 pb-4 px-4 space-y-4">

                {/* ── Account + Date ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="account">
                      {formData.type === 'transfer' ? 'From Account' : 'Account'} <span className="text-destructive">*</span>
                    </Label>
                    {originalAcctDeleted && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground italic mb-1">
                        <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                        Previously linked to deleted account
                      </div>
                    )}
                    <Select
                      value={formData.accountId}
                      onValueChange={(v) => setFormData({ ...formData, accountId: v, toAccountId: formData.toAccountId === v ? '' : formData.toAccountId })}>
                      <SelectTrigger id="account">
                        {selectedAccount ? (
                          <div className="flex items-center justify-between w-full pr-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate" title={selectedAccount.name}>{selectedAccount.name}</span>
                              {selectedAccount.is_primary && (
                                <Star size={11} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            <span className={`text-xs font-medium ml-2 flex-shrink-0 ${isOverBalance || isTransferOverBalance ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                              {fmt(selectedAccount.balance)}
                            </span>
                          </div>
                        ) : <SelectValue placeholder="Select account" />}
                      </SelectTrigger>
                      <SelectContent>
                        {(formData.type === 'transfer' ? fromAccountOptions : accounts).map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <div className="flex items-center gap-2">
                              <span>{acc.name}</span>
                              {acc.is_primary && (
                                <Star size={11} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="date">Date</Label>
                    {/* ✅ color-scheme fix: ikon kalender native browser rapi di semua mode */}
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full [color-scheme:light] dark:[color-scheme:dark]"
                      required
                    />
                  </div>
                </div>

                {/* ── Amount ── */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
                    <span className="text-[11px] text-muted-foreground">
                      Use <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border">,</kbd> for decimals&nbsp;
                      <span className="opacity-60">(e.g.: 300.010,50)</span>
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
                      className={`pl-9 font-semibold ${isOverBalance || isTransferOverBalance ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                  </div>
                  {amountError && <p className="text-xs text-destructive">{amountError}</p>}
                  {(isOverBalance || isTransferOverBalance) && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle size={12} />
                      <span>
                        Exceeds balance. Shortfall: {fmt((formData.amount + (taxEnabled ? taxAmount : 0)) - availableBalance)}
                        {taxEnabled && taxAmount > 0 && <span className="opacity-70 ml-1">(incl. tax {fmt(taxAmount)})</span>}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Type + Category bersampingan ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => handleTypeChange(v as 'income' | 'expense' | 'transfer')}
                      disabled={!isNew && isTransfer}>
                      <SelectTrigger id="type"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">
                          <div className="flex items-center gap-2"><TrendingUp size={14} className="text-green-600" /><span>Income</span></div>
                        </SelectItem>
                        <SelectItem value="expense">
                          <div className="flex items-center gap-2"><TrendingDown size={14} className="text-red-600" /><span>Expense</span></div>
                        </SelectItem>
                        <SelectItem value="transfer" disabled={accounts.length < 2}>
                          <div className="flex items-center gap-2">
                            <ArrowLeftRight size={14} className="text-blue-600" />
                            <span>Transfer</span>
                            {accounts.length < 2 && <span className="text-xs text-muted-foreground">(need 2+ accounts)</span>}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Kolom kanan: Category (income/expense) atau To Account (transfer) */}
                  {formData.type !== 'transfer' ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                      <CategorySelect
                        id="category"
                        categories={allCategoriesForType}
                        value={formData.subcategoryId || formData.categoryId}
                        onChange={(categoryId, subcategoryId) => setFormData(prev => ({ ...prev, categoryId, subcategoryId }))}
                        placeholder={typeSelected ? 'Select category' : 'Select type first'}
                        disabled={!typeSelected}
                        className={!typeSelected ? 'opacity-50 cursor-not-allowed' : ''}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="toAccount">To Account <span className="text-destructive">*</span></Label>
                      <Select value={formData.toAccountId} onValueChange={(v) => setFormData({ ...formData, toAccountId: v })}>
                        <SelectTrigger id="toAccount">
                          {selectedToAccount ? (
                            <div className="flex items-center justify-between w-full pr-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{selectedToAccount.name}</span>
                                {selectedToAccount.is_primary && (
                                  <Star size={11} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                                )}
                              </div>
                              <span className="text-xs font-medium ml-2 text-muted-foreground flex-shrink-0">
                                {fmt(selectedToAccount.balance)}
                              </span>
                            </div>
                          ) : <SelectValue placeholder="Select destination account" />}
                        </SelectTrigger>
                        <SelectContent>
                          {toAccountOptions.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              <div className="flex items-center gap-2">
                                <span>{acc.name}</span>
                                {acc.is_primary && (
                                  <Star size={11} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* ── Transfer route info ── */}
                {formData.type === 'transfer' && formData.accountId && formData.toAccountId && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                    <ArrowLeftRight size={12} />
                    <span>
                      <strong>{getAccountName(formData.accountId)}</strong>
                      {' → '}
                      <strong>{getAccountName(formData.toAccountId)}</strong>
                      {formData.amount > 0 && <span className="ml-1">· {fmt(formData.amount)}</span>}
                    </span>
                  </div>
                )}

                {/* ── Description ── */}
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
                    placeholder={formData.type === 'transfer' ? 'Add a note about this transfer...' : 'Add a note about this transaction...'}
                    maxLength={MAX_DESC}
                    minHeight={100}
                  />
                </div>

                {/* ── Save Template — hanya saat new & income/expense ── */}
                {isNew && formData.type && formData.type !== 'transfer' && formData.amount > 0 && formData.categoryId && (
                  <div className="border-t border-border/30 pt-3">
                    {!showSaveTemplate ? (
                      <button type="button" onClick={() => setShowSaveTemplate(true)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Bookmark size={12} /> Save as Template
                      </button>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Template name (e.g.: Monthly Salary)"
                          value={templateName}
                          onChange={e => setTemplateName(e.target.value.slice(0, 40))}
                          className="text-sm h-8 flex-1"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSaveTemplate(); }
                            if (e.key === 'Escape') { setShowSaveTemplate(false); setTemplateName(''); }
                          }}
                        />
                        <Button type="button" size="sm" className="h-8 text-xs px-3"
                          onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs"
                          onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tax Section — hanya untuk transaksi baru ── */}
                {isNew && (
                  <div className="border-t border-border/50 pt-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={taxEnabled}
                        onClick={() => setTaxEnabled(v => !v)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          taxEnabled ? 'bg-primary' : 'bg-input'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          taxEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                      <Label
                        className="cursor-pointer select-none"
                        onClick={() => setTaxEnabled(v => !v)}
                      >
                        Add Tax{' '}
                        <span className="font-normal text-xs text-muted-foreground">(Optional)</span>
                      </Label>
                    </div>

                    {taxEnabled && (
                      <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Tax Type</Label>
                            <Select
                              value={taxType}
                              onValueChange={(v) => {
                                setTaxType(v as 'percent' | 'nominal');
                                setTaxValueDisplay('');
                                setTaxValue(0);
                              }}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent">Percentage (%)</SelectItem>
                                <SelectItem value="nominal">Amount (Rp)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Value</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none">
                                {taxType === 'percent' ? '%' : 'Rp'}
                              </span>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={taxValueDisplay}
                                onChange={handleTaxValueChange}
                                placeholder="0"
                                className="pl-8"
                              />
                            </div>
                          </div>
                        </div>

                        {taxNominalExceedsAmount && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle size={12} />
                            <span>Tax amount exceeds transaction amount ({fmt(formData.amount)})</span>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label>Tax Category</Label>
                          <Select value={taxCategoryId} onValueChange={setTaxCategoryId}>
                            <SelectTrigger>
                              <SelectValue placeholder={expenseCategories.length === 0 ? 'Auto: "Tax"' : 'Select category'} />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!defaultTaxCategory && expenseCategories.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              No "Tax" category found. It will be created automatically when saving.
                            </p>
                          )}
                        </div>

                        {taxAmount > 0 && (
                          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                              <Receipt size={12} />
                              <span>Tax amount recorded:</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{fmt(taxAmount)}</span>
                              {taxType === 'percent' && taxValue > 0 && (
                                <span className="block text-[10px] text-amber-600/70 dark:text-amber-400/70">
                                  {taxValue}% of {fmt(formData.amount)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Edit mode: info bahwa pajak dicatat terpisah ── */}
                {!isNew && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                    <Receipt size={12} className="flex-shrink-0" />
                    <span>Tax (if any) has been recorded as a separate expense transaction.</span>
                  </div>
                )}

                {isNew && formData.type !== 'transfer' && (
                  <PendingAttachmentPicker pendingFiles={pendingFiles} onAddFiles={addFiles}
                    onRemoveFile={removePendingFile} isUploading={isUploadingPending} disabled={isBusy} />
                )}
              </CardContent>
            </Card>

            {/* ── Attachments — hanya untuk non-transfer ── */}
            {!isNew && formData.type !== 'transfer' && (
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

            {/* ── Summary ── */}
            {!isNew && transaction && (
              <Card className="bg-white dark:bg-card border-2 border-slate-200 dark:border-border shadow-sm rounded-xl">
                <CardContent className="pt-4 pb-4 px-4 space-y-2.5">
                  <p className="text-sm font-semibold text-foreground mb-1">Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isTransfer ? 'From Account' : 'Account'}</span>
                    <span className={`font-medium ${!transaction.accountId ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                      {getAccountName(transaction.accountId)}
                    </span>
                  </div>
                  {isTransfer && transaction.toAccountId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">To Account</span>
                      <span className="font-medium text-foreground">{getAccountName(transaction.toAccountId)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-foreground font-medium">
                      {new Date(transaction.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant={transaction.type === 'income' ? 'default' : transaction.type === 'transfer' ? 'secondary' : 'destructive'}>
                      {transaction.type === 'income' ? 'Income' : transaction.type === 'transfer' ? 'Transfer' : 'Expense'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className={`font-semibold ${
                      transaction.type === 'income' ? 'text-green-600 dark:text-green-400' :
                      transaction.type === 'transfer' ? 'text-blue-600 dark:text-blue-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '↔' : '-'}{fmt(transaction.amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isBusy || isOverBalance || isTransferOverBalance || (!isNew && isTransfer && !transaction?.toAccountId)}>
              {isBusy
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {isUploadingPending ? 'Uploading...' : 'Saving...'}</>
                : <><Save size={15} /> {isNew ? (formData.type === 'transfer' ? 'Save Transfer' : 'Save Transaction') : (formData.type === 'transfer' ? 'Update Transfer' : 'Update Transaction')}</>
              }
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}