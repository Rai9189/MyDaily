// src/app/components/AuthShell.tsx
import { ReactNode } from 'react';
import { Card, CardContent } from './ui/card';

interface AuthShellProps {
  children: ReactNode;
  align?: 'center' | 'start';
  cardClassName?: string;
}

export function AuthShell({ children, align = 'center', cardClassName = '' }: AuthShellProps) {
  return (
    <div className={`min-h-screen bg-background flex ${align === 'start' ? 'items-start py-8' : 'items-center'} justify-center p-4 overflow-y-auto`}>
      <div className="w-full max-w-sm">
        <Card className={`border border-border bg-white dark:bg-card shadow-sm rounded-2xl ${cardClassName}`}>
          <CardContent className="pt-8 pb-7 px-7">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AuthHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="flex flex-col items-center mb-6">
      <img src="/logo.png" alt="MyDaily" className="h-14 w-auto object-contain mb-3 dark:invert" />
      <h1 className="text-2xl font-bold text-foreground text-center">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1 text-center">{subtitle}</p>}
    </div>
  );
}
