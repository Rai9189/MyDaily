// src/app/components/Layout.tsx
import { useState, useEffect, useRef, ReactNode, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Plus, CreditCard, CheckSquare, FileText, X, Loader2 } from 'lucide-react';
import { Navbar } from './Navbar';
import { GlobalSearch } from './GlobalSearch';
import { RouteErrorBoundary } from './RouteErrorBoundary';

// Warms the "add" pages' chunks (TransactionDetail/TaskDetail/NoteDetail + the
// heavy RichTextEditor deps they pull in) during idle time, so the first tap on
// "+" doesn't race a fresh fetch on a flaky mobile connection and trip the
// RouteErrorBoundary's chunk-load fallback. Module-level flag: Layout remounts
// on every route change (it's re-instantiated per <Route>), but the fetch only
// needs to happen once per session — the browser caches the chunk after that.
let detailChunksPrefetched = false;
function prefetchDetailChunks() {
  if (detailChunksPrefetched) return;
  detailChunksPrefetched = true;
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1000));
  idle(() => {
    import('../pages/TransactionDetail');
    import('../pages/TaskDetail');
    import('../pages/NoteDetail');
  });
}

// Kept inside Layout (not the App-level Suspense) so only the content area
// swaps to this while a page chunk loads — navbar/sidebar stay mounted.
function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

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
  const reduceMotion = useReducedMotion();

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
    <div className="fixed right-4 z-50 md:hidden flex flex-col items-end gap-2 bottom-[calc(5rem+env(safe-area-inset-bottom))]" ref={ref}>
      <AnimatePresence>
        {open && (
          <motion.div className="flex flex-col items-end gap-2 mb-1">
            {SPEED_DIAL.map((opt, i) => {
              const Icon = opt.icon;
              return (
                <motion.div
                  key={opt.path}
                  className="flex items-center gap-2"
                  initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.9 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.35, delay: reduceMotion ? 0 : i * 0.03 }}
                >
                  <span className="text-xs font-semibold bg-foreground text-background px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
                    {opt.label}
                  </span>
                  <button
                    onClick={() => { setOpen(false); navigate(opt.path); }}
                    className={`w-11 h-11 rounded-full ${opt.color} text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform`}
                  >
                    <Icon size={18} />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center"
        aria-label="Quick add"
        animate={{ rotate: open ? 45 : 0 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      >
        {open ? <X size={24} /> : <Plus size={26} />}
      </motion.button>
    </div>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => { prefetchDetailChunks(); }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:pl-72">
      <Navbar onOpenSearch={() => setSearchOpen(true)} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* pt-* clears the top navbar (64px + notch inset); pb-* clears the bottom nav (64px + home-indicator inset) on mobile; lg:pl-72 (on parent) clears the persistent sidebar */}
      <main
        className="flex-1 pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 flex flex-col overflow-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <style>{`main::-webkit-scrollbar { display: none; }`}</style>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            className="w-full px-4 py-4 md:px-6 md:py-6 flex flex-col flex-1 min-h-0"
          >
            <Suspense fallback={<PageLoading />}>
              <RouteErrorBoundary compact>
                {children}
              </RouteErrorBoundary>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <DashboardFAB />
    </div>
  );
}
