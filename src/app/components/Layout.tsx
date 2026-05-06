// src/app/components/Layout.tsx
import { useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, CreditCard, CheckSquare, FileText, X } from 'lucide-react';
import { Navbar } from './Navbar';

const SPEED_DIAL = [
  { label: 'Transaction', icon: CreditCard,  path: '/transactions/new', color: 'bg-green-500 hover:bg-green-600' },
  { label: 'Task',        icon: CheckSquare, path: '/tasks/new',        color: 'bg-orange-500 hover:bg-orange-600' },
  { label: 'Note',        icon: FileText,    path: '/notes/new',        color: 'bg-blue-500 hover:bg-blue-600' },
];

function DashboardFAB() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // useEffect must come before any early return — Rules of Hooks
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Only render on the dashboard
  if (location.pathname !== '/') return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden flex flex-col items-end gap-2" ref={ref}>
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1">
          {SPEED_DIAL.map(opt => {
            const Icon = opt.icon;
            return (
              <div key={opt.path} className="flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-150">
                <span className="text-xs font-semibold bg-foreground text-background px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
                  {opt.label}
                </span>
                <button
                  onClick={() => { setOpen(false); navigate(opt.path); }}
                  className={`w-11 h-11 rounded-full ${opt.color} text-white shadow-lg flex items-center justify-center active:scale-95 transition-all`}
                >
                  <Icon size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className={`w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center active:scale-95 transition-all duration-200 ${open ? 'rotate-45' : ''}`}
        aria-label="Quick add"
      >
        {open ? <X size={24} /> : <Plus size={26} />}
      </button>
    </div>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* pt-16 = top navbar; pb-16 md:pb-0 = bottom nav clearance on mobile */}
      <main
        className="flex-1 pt-16 pb-16 md:pb-0 flex flex-col overflow-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <style>{`main::-webkit-scrollbar { display: none; }`}</style>
        <div className="w-full mx-auto px-4 py-4 md:px-6 md:py-6 flex flex-col flex-1 min-h-0">
          {children}
        </div>
      </main>

      <DashboardFAB />
    </div>
  );
}
