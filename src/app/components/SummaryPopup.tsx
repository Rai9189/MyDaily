// src/app/components/SummaryPopup.tsx
import { TrendingUp, TrendingDown, ArrowLeftRight, X, ChevronRight } from 'lucide-react';

export type PopupType = 'income' | 'expense' | 'transfer' | null;

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

export function SummaryPopup({
  type, amount, txCount, percentage, onClose, onViewAll,
}: {
  type: PopupType;
  amount: number;
  txCount: number;
  percentage?: string;
  onClose: () => void;
  onViewAll: () => void;
}) {
  if (!type) return null;

  const config = {
    income: {
      label: 'Income',
      icon: <TrendingUp size={18} />,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-zinc-900',
      border: 'border-green-200 dark:border-green-700',
      iconBg: 'bg-green-100 dark:bg-green-900/60',
      innerBg: 'bg-white dark:bg-zinc-800',
      btnBg: 'bg-green-100 dark:bg-green-900/60 hover:bg-green-200 dark:hover:bg-green-900',
    },
    expense: {
      label: 'Expense',
      icon: <TrendingDown size={18} />,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-zinc-900',
      border: 'border-red-200 dark:border-red-700',
      iconBg: 'bg-red-100 dark:bg-red-900/60',
      innerBg: 'bg-white dark:bg-zinc-800',
      btnBg: 'bg-red-100 dark:bg-red-900/60 hover:bg-red-200 dark:hover:bg-red-900',
    },
    transfer: {
      label: 'Transfer',
      icon: <ArrowLeftRight size={18} />,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-zinc-900',
      border: 'border-blue-200 dark:border-blue-700',
      iconBg: 'bg-blue-100 dark:bg-blue-900/60',
      innerBg: 'bg-white dark:bg-zinc-800',
      btnBg: 'bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-900',
    },
  };

  const c = config[type];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-72 rounded-2xl border-2 ${c.border} ${c.bg} shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-full ${c.iconBg} flex items-center justify-center ${c.color}`}>
              {c.icon}
            </div>
            <span className={`font-semibold text-base ${c.color}`}>{c.label}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
          <p className={`text-2xl font-bold tracking-tight ${c.color}`}>{fmt(amount)}</p>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-1 ${c.innerBg} rounded-xl px-3 py-2 text-center`}>
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-lg font-bold text-foreground">{txCount}</p>
          </div>
          {percentage && (
            <div className={`flex-1 ${c.innerBg} rounded-xl px-3 py-2 text-center`}>
              <p className="text-xs text-muted-foreground">Portion</p>
              <p className={`text-lg font-bold ${c.color}`}>{percentage}%</p>
            </div>
          )}
        </div>

        <button
          onClick={onViewAll}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${c.btnBg} ${c.color} flex items-center justify-center gap-1.5`}
        >
          View All {c.label} <ChevronRight size={15} />
        </button>
      </div>
    </>
  );
}
