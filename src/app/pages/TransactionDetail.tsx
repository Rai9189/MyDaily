import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { useAttachments } from '../context/AttachmentContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, X, Loader2, FileText, Image as ImageIcon, Trash2, Save } from 'lucide-react';
import { formatFileSize, isImageFile } from '../../lib/supabase';

export function TransactionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';

  const { getTransactionById, createTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { getCategoriesByType } = useCategories();
  const { uploadAttachment, deleteAttachment, getAttachments } = useAttachments();

  const transaction = isNew ? null : getTransactionById(id!);
  const transactionCategories = getCategoriesByType('transaction');

  const [formData, setFormData] = useState({
    accountId: transaction?.accountId || (accounts[0]?.id || ''),
    amount: transaction?.amount || 0,
    type: transaction?.type || 'Keluar' as 'Masuk' | 'Keluar',
    date: transaction?.date || new Date().toISOString().split('T')[0],
    categoryId: transaction?.categoryId || (transactionCategories[0]?.id || ''),
    description: transaction?.description || '',
  });

  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isNew && id) loadAttachments();
  }, [id]);

  useEffect(() => {
    if (transaction) {
      setFormData({
        accountId: transaction.accountId,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        categoryId: transaction.categoryId,
        description: transaction.description || '',
      });
    }
  }, [transaction]);

  const loadAttachments = async () => {
    if (!id) return;
    const { data } = await getAttachments('transaction', id);
    if (data) setAttachments(data);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const getAccountName = (accountId: string) =>
    accounts.find(a => a.id === accountId)?.name || 'Unknown';

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
    setSubmitting(true);
    try {
      if (isNew) {
        const { success, error } = await createTransaction(formData);
        if (success) navigate('/transactions');
        else alert(error || 'Failed to create transaction');
      } else {
        const { success, error } = await updateTransaction(id!, formData);
        if (success) navigate('/transactions');
        else alert(error || 'Failed to update transaction');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this transaction? All attachments will also be removed.')) return;
    setDeleting(true);
    const { success, error } = await deleteTransaction(id!);
    if (success) navigate('/transactions');
    else { alert(error || 'Failed to delete transaction'); setDeleting(false); }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
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

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Main Form */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Transaction Info</CardTitle>
              {/* ✅ Delete di pojok kanan atas card — tidak awkward, mudah ditemukan */}
              {!isNew && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {deleting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 size={15} />
                  }
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="account">Account</Label>
              <Select value={formData.accountId} onValueChange={(v) => setFormData({ ...formData, accountId: v })}>
                <SelectTrigger id="account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Transaction Type</Label>
              <Select value={formData.type} onValueChange={(v: 'Masuk' | 'Keluar') => setFormData({ ...formData, type: v })}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masuk">Income</SelectItem>
                  <SelectItem value="Keluar">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Textarea
                id="description"
                placeholder="Add a note about this transaction..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        {!isNew && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Upload File <span className="text-muted-foreground font-normal">(Max 10MB)</span></Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">
                  Supported: JPEG, PNG, GIF, WebP, PDF — max 10MB per file
                </p>
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isImageFile(file.name)
                          ? <ImageIcon size={18} className="text-primary flex-shrink-0" />
                          : <FileText size={18} className="text-red-500 flex-shrink-0" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-shrink-0 mr-2">
                          View
                        </a>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteAttachment(file.id, file.url)}>
                        <X size={15} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tip for new transaction */}
        {isNew && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Tip:</strong> Save the transaction first, then you can add attachments.
            </p>
          </div>
        )}

        {/* Summary (edit mode only) */}
        {!isNew && transaction && (
          <Card className="border border-border bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              {[
                { label: 'Account', value: getAccountName(transaction.accountId) },
                { label: 'Date', value: new Date(transaction.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Type</span>
                <Badge variant={transaction.type === 'Masuk' ? 'default' : 'destructive'}>
                  {transaction.type === 'Masuk' ? 'Income' : 'Expense'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className={`font-semibold ${transaction.type === 'Masuk' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {transaction.type === 'Masuk' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" className="flex-1 gap-2" disabled={submitting}>
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save size={16} />{isNew ? 'Save Transaction' : 'Update Transaction'}</>
            }
          </Button>
        </div>
      </form>
    </div>
  );
}