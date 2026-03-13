import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen overflow-hidden bg-background flex">
      <Sidebar />

      <main
        className="flex-1 md:ml-64 overflow-y-auto pt-14 md:pt-0 pb-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <style>{`main::-webkit-scrollbar { display: none; }`}</style>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}