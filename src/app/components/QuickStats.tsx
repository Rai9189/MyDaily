import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface QuickStatsProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

export function QuickStats({ totalBalance, monthlyIncome, monthlyExpense }: QuickStatsProps) {
  const net = monthlyIncome - monthlyExpense;

  return (
    <div className="grid gap-3 grid-cols-3">
      {/* Total Balance */}
      <Card className="bg-white dark:bg-card border shadow-sm rounded-lg overflow-hidden">
        <CardContent className="pt-3 pb-3 px-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Wallet size={10} className="text-primary" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Balance</span>
          </div>
          <p className="text-sm font-bold text-foreground">{fmt(totalBalance)}</p>
        </CardContent>
      </Card>

      {/* Monthly Income */}
      <Card className="bg-white dark:bg-card border shadow-sm rounded-lg overflow-hidden">
        <CardContent className="pt-3 pb-3 px-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={10} className="text-green-600" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Income</span>
          </div>
          <p className="text-sm font-bold text-green-600">{fmt(monthlyIncome)}</p>
        </CardContent>
      </Card>

      {/* Monthly Expense */}
      <Card className="bg-white dark:bg-card border shadow-sm rounded-lg overflow-hidden">
        <CardContent className="pt-3 pb-3 px-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingDown size={10} className="text-red-600" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Expense</span>
          </div>
          <p className="text-sm font-bold text-red-600">{fmt(monthlyExpense)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
