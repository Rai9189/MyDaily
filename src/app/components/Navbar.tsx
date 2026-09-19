// src/app/components/Navbar.tsx
import { useState, useEffect, useRef } from 'react';
import { Home, CreditCard, CheckSquare, FileText, Wallet, User, LogOut, Settings, Menu, X, Trash2, Tag, MoreHorizontal, Plus, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/',             icon: Home,        label: 'Dashboard' },
  { path: '/transactions', icon: CreditCard,  label: 'Transactions' },
  { path: '/tasks',        icon: CheckSquare, label: 'Tasks' },
  { path: '/notes',        icon: FileText,    label: 'Notes' },
  { path: '/accounts',     icon: Wallet,      label: 'Accounts' },
];

// Account-level actions live in the avatar menu, not the nav list
const userMenuItems = [
  { path: '/profile',  icon: User,     label: 'Profile' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

// The 4 items covered by the mobile bottom nav — hidden in drawer on mobile only
const BOTTOM_NAV_PATHS = new Set(['/', '/transactions', '/tasks', '/notes']);

const bottomNavItems = [
  { path: '/',             icon: Home,        label: 'Home' },
  { path: '/transactions', icon: CreditCard,  label: 'Finance' },
  { path: '/tasks',        icon: CheckSquare, label: 'Tasks' },
  { path: '/notes',        icon: FileText,    label: 'Notes' },
];

const quickAccessItems = [
  { path: '/categories', icon: Tag,    label: 'Categories' },
  { path: '/trash',      icon: Trash2, label: 'Trash' },
];

// Pages that get a quick-add "+" in the top navbar on mobile
const ADD_ROUTES: Record<string, string> = {
  '/notes':        '/notes/new',
  '/tasks':        '/tasks/new',
  '/transactions': '/transactions/new',
  '/accounts':     '/accounts?add=true',
};

export function Navbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Swipe-to-dismiss on the mobile/tablet drawer — the lg+ sidebar isn't a modal, so it opts out.
  const onDrawerPointerDown = (e: React.PointerEvent) => {
    if (!open || window.innerWidth >= 1024) return;
    dragStart.current = { x: e.clientX, y: e.clientY, axis: null };
  };

  const onDrawerPointerMove = (e: React.PointerEvent) => {
    const start = dragStart.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (start.axis === 'x' && dx < 0) {
        setDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        dragStart.current = null; // vertical scroll or dragging the wrong way — let it pass through
        return;
      }
    }
    if (start.axis === 'x') {
      e.preventDefault();
      setDragX(Math.min(0, dx));
    }
  };

  const onDrawerPointerUp = () => {
    if (dragging) {
      const width = drawerRef.current?.offsetWidth ?? 288;
      if (dragX < -width * 0.35) setOpen(false);
    }
    setDragging(false);
    setDragX(0);
    dragStart.current = null;
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [userMenuOpen]);

  useEffect(() => { setUserMenuOpen(false); }, [location.pathname]);

  const getIsActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // "More" tab active when on any page not in the bottom nav
  const moreIsActive = !BOTTOM_NAV_PATHS.has(location.pathname) &&
    !location.pathname.startsWith('/transactions/') &&
    !location.pathname.startsWith('/tasks/') &&
    !location.pathname.startsWith('/notes/');

  const getPageTitle = () => {
    if (location.pathname === '/trash')      return 'Trash';
    if (location.pathname === '/categories') return 'Categories';
    if (location.pathname === '/settings')   return 'Settings';
    if (location.pathname === '/accounts')   return 'Accounts';
    if (location.pathname === '/profile')    return 'Profile';
    if (location.pathname === '/transactions/new')      return 'New Transaction';
    if (location.pathname.startsWith('/transactions/')) return 'Transaction Detail';
    if (location.pathname === '/tasks/new')             return 'New Task';
    if (location.pathname.startsWith('/tasks/'))        return 'Task Detail';
    if (location.pathname === '/notes/new')             return 'New Note';
    if (location.pathname.startsWith('/notes/'))        return 'Note Detail';
    if (location.pathname.startsWith('/accounts/'))     return 'Account Detail';
    return navItems.find(item =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    )?.label ?? 'Dashboard';
  };

  const handleLogout = async () => {
    setOpen(false);
    setUserMenuOpen(false);
    sessionStorage.removeItem('pinUnlocked');
    await signOut();
    navigate('/login');
  };

  const addPath = ADD_ROUTES[location.pathname];

  return (
    <>
      {/* ── Top Navbar ── */}
      <header className="app-header fixed top-0 left-0 right-0 h-16 bg-sidebar/90 backdrop-blur-xl backdrop-saturate-150 border-b border-sidebar-border flex items-center px-4 z-50 shadow-md">
        {/* Hamburger — tablet only; mobile uses bottom nav, desktop (lg+) uses the persistent sidebar */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sidebar-foreground p-2 rounded-lg hover:bg-sidebar-foreground/10 transition-colors hidden md:flex lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={26} />
        </button>

        <span className="text-sidebar-foreground font-bold text-xl tracking-tight flex-1 md:ml-3">{getPageTitle()}</span>

        {/* Search trigger — desktop only, mobile uses bottom nav */}
        <button
          type="button"
          onClick={onOpenSearch}
          title="Search"
          className="hidden md:flex items-center gap-2 px-3.5 py-2 lg:w-56 text-sm text-sidebar-foreground/70 bg-sidebar-foreground/10 hover:bg-sidebar-foreground/15 hover:text-sidebar-foreground rounded-full transition-colors"
        >
          <Search size={16} className="flex-shrink-0" />
          <span className="hidden lg:inline truncate">Search</span>
        </button>

        {/* Quick-add "+" — mobile only, on list pages */}
        {addPath && (
          <button
            type="button"
            onClick={() => navigate(addPath)}
            className="md:hidden text-sidebar-foreground p-2 rounded-lg hover:bg-sidebar-foreground/10 transition-colors"
            aria-label="Add new"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        )}

        {/* Avatar menu — Profile, Settings, Sign out */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(o => !o)}
            className="w-9 h-9 rounded-full bg-sidebar-foreground/10 hover:bg-sidebar-foreground/15 flex items-center justify-center text-sidebar-foreground transition-colors"
            aria-label="Account menu"
          >
            <User size={18} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-11 w-48 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50">
              {userMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="my-1.5 border-t border-border" />
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Overlay (drawer mode only — the lg+ sidebar isn't modal) ── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setOpen(false)}
          style={dragging ? { opacity: Math.max(0, 1 - Math.abs(dragX) / (drawerRef.current?.offsetWidth ?? 288)), transition: 'none' } : undefined}
        />
      )}

      {/* ── Drawer on mobile/tablet, permanent sidebar from lg+ ── */}
      <div
        ref={drawerRef}
        onPointerDown={onDrawerPointerDown}
        onPointerMove={onDrawerPointerMove}
        onPointerUp={onDrawerPointerUp}
        onPointerCancel={onDrawerPointerUp}
        className={`bg-sidebar fixed left-0 top-0 bottom-0 lg:top-16 w-72 z-50 lg:z-30 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none lg:border-r lg:border-sidebar-border ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={dragging ? { transform: `translateX(${dragX}px)`, transition: 'none' } : undefined}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border lg:hidden">
          <img src="/logo.png" alt="MyDaily" className="h-14 w-auto object-contain dark:invert" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground p-1.5 rounded-lg hover:bg-sidebar-foreground/10 transition-colors"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = getIsActive(item.path);
            const Icon = item.icon;
            const mobileHidden = BOTTOM_NAV_PATHS.has(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`${mobileHidden ? 'hidden md:flex' : 'flex'} items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Quick Access — visible on all screen sizes */}
          <div className="border-t border-sidebar-border mt-2 pt-3">
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest font-semibold px-4 mb-1">Quick Access</p>
            {quickAccessItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-0.5 transition-colors text-sm ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ── Bottom Nav (mobile only) ── */}
      <nav className="app-bottomnav fixed bottom-0 left-0 right-0 h-16 bg-background/85 backdrop-blur-xl backdrop-saturate-150 border-t border-border z-40 flex md:hidden shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        {bottomNavItems.map((item) => {
          const isActive = getIsActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}

        {/* More tab — opens drawer for secondary pages */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
            moreIsActive ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <MoreHorizontal size={22} strokeWidth={moreIsActive ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </nav>
    </>
  );
}
