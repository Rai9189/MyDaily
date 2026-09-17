import { FileText, CreditCard, CheckSquare, Wallet, Tag } from 'lucide-react';

type EmptyStateType = 'transactions' | 'tasks' | 'notes' | 'accounts' | 'categories';

interface EmptyStateProps {
  type: EmptyStateType;
  onAction?: () => void;
}

const emptyStateConfig: Record<EmptyStateType, { icon: React.ReactNode; title: string; description: string; actionLabel?: string }> = {
  transactions: {
    icon: <CreditCard size={48} className="text-muted-foreground/40" />,
    title: 'No Transactions Yet',
    description: 'Start tracking your money by adding your first transaction',
    actionLabel: 'Add Transaction',
  },
  tasks: {
    icon: <CheckSquare size={48} className="text-muted-foreground/40" />,
    title: 'No Tasks Yet',
    description: 'Create a task to organize your work and stay productive',
    actionLabel: 'Create Task',
  },
  notes: {
    icon: <FileText size={48} className="text-muted-foreground/40" />,
    title: 'No Notes Yet',
    description: 'Write down your thoughts and ideas',
    actionLabel: 'Create Note',
  },
  accounts: {
    icon: <Wallet size={48} className="text-muted-foreground/40" />,
    title: 'No Accounts Yet',
    description: 'Add an account to start managing your finances',
    actionLabel: 'Add Account',
  },
  categories: {
    icon: <Tag size={48} className="text-muted-foreground/40" />,
    title: 'No Categories Yet',
    description: 'Create categories to organize your transactions',
    actionLabel: 'Add Category',
  },
};

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const config = emptyStateConfig[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/50">
        {config.icon}
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-1">{config.title}</h3>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>
      {onAction && config.actionLabel && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {config.actionLabel}
        </button>
      )}
    </div>
  );
}
