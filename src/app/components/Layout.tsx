// src/app/components/Layout.tsx
import { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* pt-16 matches new navbar height h-16 */}
      <main
        className="flex-1 pt-16 flex flex-col overflow-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <style>{`main::-webkit-scrollbar { display: none; }`}</style>
        {/* Reduced px so table uses more horizontal space */}
        <div className="w-full mx-auto px-4 py-4 md:px-6 md:py-6 flex flex-col flex-1 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}