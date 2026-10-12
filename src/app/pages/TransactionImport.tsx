// src/app/pages/TransactionImport.tsx
// Import transactions from a BCA "Mutasi Rekening" PDF. The file is parsed in the
// browser and never uploaded; only the rows the user confirms are saved.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileUp, Loader2, AlertTriangle, ArrowUpDown, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTransactions } from '../context/TransactionContext';
import { useAccounts } from '../context/AccountContext';
import { useCategories } from '../context/CategoryContext';
import { CategorySelect } from '../components/CategorySelect';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { parseBcaStatement, readPdfLines } from '../../lib/bcaStatement';
import { fmtIDR } from '../../lib/formatCurrency';
import { Category, TransactionType } from '../types';

interface Row {
  key: number;
  checked: boolean;
  date: string;
  amount: number;
  direction: 'out' | 'in';       // DB → out, CR → in (decides transfer from/to)
  type: TransactionType;
  categoryId: string;
  subcategoryId: string | null;
  counterAccountId: string;      // transfer only: destination (out) or source (in)
  description: string;
  pending: boolean;              // BCA "PEND": not booked yet, will reappear in a later statement
  dup: boolean;                  // computed on parse/account change, not live — rows saved during import would match themselves
}

const isOther = (c: Category) => /other|lain/i.test(c.name);

export function TransactionImport() {
  const navigate = useNavigate();
  const { transactions, createTransaction, createTransfer } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const fileInput = useRef<HTMLInputElement>(null);

  const [accountId, setAccountId] = useState(() => (accounts.find(a => a.is_primary) ?? accounts[0])?.id ?? '');
  const [fileName, setFileName]   = useState('');
  const [rows, setRows]           = useState<Row[]>([]);
  const [parsing, setParsing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [newestFirst, setNewestFirst] = useState(false);

  // Accounts may still be loading on first render
  useEffect(() => {
    if (!accountId && accounts.length) setAccountId((accounts.find(a => a.is_primary) ?? accounts[0]).id);
  }, [accounts, accountId]);

  const categoriesFor = (type: TransactionType) => {
    const parents = categories.filter(c => c.type === 'transaction' && !c.parentId && c.subtype === type);
    const ids = new Set(parents.map(p => p.id));
    return [...parents, ...categories.filter(c => c.parentId && ids.has(c.parentId))];
  };

  // Same fallback TransactionDetail uses for transfers
  const transferCategoryId = useMemo(() => {
    const top = categories.filter(c => c.type === 'transaction' && !c.parentId);
    return (top.find(isOther) ?? top[0])?.id ?? '';
  }, [categories]);

  const defaultCategoryId = (type: TransactionType) => {
    if (type === 'transfer') return transferCategoryId;
    const parents = categoriesFor(type).filter(c => !c.parentId);
    return (parents.find(isOther) ?? parents[0])?.id ?? '';
  };

  // ponytail: duplicate = same account + date + amount, any type; good enough to flag re-imports
  const isDuplicate = (r: Row, account = accountId) =>
    transactions.some(t => t.accountId === account && t.date === r.date && t.amount === r.amount);

  const update = (key: number, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const changeType = (key: number, type: TransactionType) =>
    update(key, { type, categoryId: defaultCategoryId(type), subcategoryId: null, counterAccountId: '' });

  const changeAccount = (id: string) => {
    setAccountId(id);
    setRows(prev => prev.map(r => ({ ...r, dup: isDuplicate(r, id), checked: !r.pending && !isDuplicate(r, id), counterAccountId: r.counterAccountId === id ? '' : r.counterAccountId })));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please choose a PDF file.'); return; }
    setParsing(true);
    try {
      const parsed = parseBcaStatement(await readPdfLines(file));
      if (parsed.length === 0) {
        toast.error('No transactions found. Make sure this is a BCA "Mutasi Rekening" PDF.');
        return;
      }
      setFileName(file.name);
      setNewestFirst(false);
      // Oldest first by default; same-day rows keep their PDF order (stable sort)
      parsed.sort((a, b) => a.date.localeCompare(b.date));
      setRows(parsed.map((p, i) => {
        const row: Row = {
          key: i, checked: true, ...p,
          direction: p.type === 'expense' ? 'out' : 'in',
          categoryId: defaultCategoryId(p.type), subcategoryId: null, counterAccountId: '', dup: false,
        };
        const dup = isDuplicate(row);
        return { ...row, dup, checked: !dup && !p.pending };
      }));
    } catch {
      toast.error('Could not read this PDF. It may be password-protected or damaged.');
    } finally {
      setParsing(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const selected = rows.filter(r => r.checked);
  const invalid = (r: Row) =>
    !r.date || !r.categoryId || (r.type === 'transfer' && (!r.counterAccountId || r.counterAccountId === accountId));

  // Bulk category: only offered when every selected non-transfer row has the same type
  const bulkTypes = [...new Set(selected.filter(r => r.type !== 'transfer').map(r => r.type))];
  const bulkType = bulkTypes.length === 1 ? bulkTypes[0] : null;

  const handleSave = async () => {
    if (!accountId) { toast.error('Choose an account first.'); return; }
    if (selected.some(invalid)) { toast.error('Some selected rows are missing a category or transfer account.'); return; }

    setSaving(true);
    const savedKeys = new Set<number>();
    // ponytail: one insert per row via the existing context functions (each refreshes balances);
    // switch to a single bulk insert if large statements feel slow.
    for (const r of selected) {
      const description = r.description.trim();
      const res = r.type === 'transfer'
        ? await createTransfer({
            fromAccountId: r.direction === 'out' ? accountId : r.counterAccountId,
            toAccountId:   r.direction === 'out' ? r.counterAccountId : accountId,
            amount: r.amount, date: r.date, description, categoryId: r.categoryId,
          })
        : await createTransaction({
            accountId, amount: r.amount, type: r.type, date: r.date, description,
            categoryId: r.categoryId, subcategoryId: r.subcategoryId,
          });
      if (res.success) savedKeys.add(r.key);
    }
    setSaving(false);

    const failed = selected.length - savedKeys.size;
    if (failed === 0) {
      toast.success(`${savedKeys.size} transaction${savedKeys.size === 1 ? '' : 's'} imported.`);
      navigate('/transactions');
    } else {
      setRows(prev => prev.filter(r => !savedKeys.has(r.key)));
      toast.error(`${savedKeys.size} imported, ${failed} failed. The failed rows are still listed.`);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 pb-6">

          <button type="button" onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={16} /> Back
          </button>

          {/* Source */}
          <Card className="bg-white dark:bg-card border-2 border-blue-200 dark:border-blue-900/50 shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Import BCA Statement</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload a "Mutasi Rekening" PDF from myBCA. The file is read on this device and never uploaded.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="import-account">Account</Label>
                <Select value={accountId} onValueChange={changeAccount} disabled={saving}>
                  <SelectTrigger id="import-account"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <input ref={fileInput} type="file" accept="application/pdf" className="hidden"
                onChange={e => handleFile(e.target.files?.[0])} />
              <Button type="button" variant="outline" className="w-full gap-2"
                onClick={() => fileInput.current?.click()} disabled={parsing || saving || !accountId}>
                {parsing ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                {fileName ? `Choose another PDF (${fileName})` : 'Choose PDF'}
              </Button>
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <>
              {/* Selection + bulk category */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 accent-primary"
                    checked={selected.length === rows.length}
                    onChange={e => setRows(prev => prev.map(r => ({ ...r, checked: e.target.checked })))} />
                  {selected.length} of {rows.length} selected
                </label>
                <Button type="button" variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground"
                  onClick={() => { setNewestFirst(v => !v); setRows(prev => [...prev].reverse()); }}>
                  <ArrowUpDown size={14} /> {newestFirst ? 'Newest first' : 'Oldest first'}
                </Button>
                {bulkType && (
                  <div className="ml-auto w-full sm:w-64">
                    <CategorySelect
                      categories={categoriesFor(bulkType)}
                      value=""
                      placeholder={`Set category for selected ${bulkType === 'expense' ? 'expenses' : 'income'}`}
                      onChange={(categoryId, subcategoryId) => setRows(prev => prev.map(r =>
                        r.checked && r.type === bulkType ? { ...r, categoryId, subcategoryId } : r))}
                    />
                  </div>
                )}
              </div>

              {/* Rows */}
              <div className="space-y-2">
                {rows.map(r => {
                  return (
                    <Card key={r.key} className={`bg-white dark:bg-card border shadow-sm rounded-xl transition-opacity ${r.checked ? 'border-border' : 'border-border opacity-60'}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" aria-label="Include this transaction" className="h-4 w-4 shrink-0 accent-primary"
                            checked={r.checked} onChange={e => update(r.key, { checked: e.target.checked })} />
                          <Input type="date" value={r.date} onChange={e => update(r.key, { date: e.target.value })}
                            className="h-8 w-[9.5rem] text-xs" />
                          <span className={`ml-auto text-sm font-semibold tabular-nums ${r.direction === 'out' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {r.direction === 'out' ? '−' : '+'}{fmtIDR(r.amount)}
                          </span>
                        </div>

                        {r.pending && (
                          <p className="flex items-start gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                            <Clock size={12} className="shrink-0 mt-0.5" />
                            <span><span className="font-semibold">Pending</span> — not booked by BCA yet. It usually appears in your next statement, so import it then to avoid duplicates.</span>
                          </p>
                        )}

                        {r.dup && (
                          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle size={12} className="shrink-0" /> Might already exist (same date and amount on this account)
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Select value={r.type} onValueChange={v => changeType(r.key, v as TransactionType)}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="transfer">Transfer</SelectItem>
                            </SelectContent>
                          </Select>

                          {r.type === 'transfer' ? (
                            <Select value={r.counterAccountId} onValueChange={v => update(r.key, { counterAccountId: v })}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder={r.direction === 'out' ? 'To account' : 'From account'} />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.filter(a => a.id !== accountId).map(a =>
                                  <SelectItem key={a.id} value={a.id}>{r.direction === 'out' ? 'To' : 'From'}: {a.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <CategorySelect
                              categories={categoriesFor(r.type)}
                              value={r.subcategoryId || r.categoryId}
                              onChange={(categoryId, subcategoryId) => update(r.key, { categoryId, subcategoryId })}
                              className="h-9 text-sm"
                            />
                          )}
                        </div>

                        <Input value={r.description} maxLength={200} placeholder="Description"
                          onChange={e => update(r.key, { description: e.target.value })} className="h-9 text-sm" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || selected.length === 0} className="gap-2">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save {selected.length} transaction{selected.length === 1 ? '' : 's'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
