// src/app/components/Navbar.tsx
import { useState } from 'react';
import { Home, CreditCard, CheckSquare, FileText, Wallet, User, LogOut, Settings, Menu, X, Trash2, Tag, MoreHorizontal, Plus } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/',             icon: Home,        label: 'Dashboard' },
  { path: '/transactions', icon: CreditCard,  label: 'Transactions' },
  { path: '/tasks',        icon: CheckSquare, label: 'Tasks' },
  { path: '/notes',        icon: FileText,    label: 'Notes' },
  { path: '/accounts',     icon: Wallet,      label: 'Accounts' },
  { path: '/profile',      icon: User,        label: 'Profile' },
  { path: '/settings',     icon: Settings,    label: 'Settings' },
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

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

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
    sessionStorage.removeItem('pinUnlocked');
    await signOut();
    navigate('/login');
  };

  const addPath = ADD_ROUTES[location.pathname];

  return (
    <>
      {/* ── Top Navbar ── */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-primary flex items-center px-4 z-50 shadow-md">
        {/* Hamburger — always visible on desktop, hidden on mobile (bottom nav handles it) */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-white p-2 rounded-lg hover:bg-white/15 transition-colors hidden md:flex"
          aria-label="Open menu"
        >
          <Menu size={26} />
        </button>

        <span className="text-white font-bold text-xl tracking-wide flex-1 md:ml-3">{getPageTitle()}</span>

        {/* Quick-add "+" — mobile only, on list pages */}
        {addPath && (
          <button
            type="button"
            onClick={() => navigate(addPath)}
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/15 transition-colors"
            aria-label="Add new"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        )}
      </header>

      {/* ── Overlay ── */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setOpen(false)} />
      )}

      {/* ── Drawer ── */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'linear-gradient(to bottom, var(--primary), color-mix(in srgb, var(--primary) 80%, black))' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
          <img src="/logo.png" alt="MyDaily" className="h-14 w-auto object-contain dark:invert" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = getIsActive(item.path);
            const Icon = item.icon;
            // On mobile, hide items already in the bottom nav (redundant there)
            const mobileHidden = BOTTOM_NAV_PATHS.has(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`${mobileHidden ? 'hidden md:flex' : 'flex'} items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-white text-primary font-semibold'
                    : 'text-white/80 hover:bg-white/15 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Quick Access — visible on all screen sizes */}
          <div className="border-t border-white/20 mt-2 pt-3">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold px-4 mb-1">Quick Access</p>
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
                      ? 'bg-white text-primary font-semibold'
                      : 'text-white/70 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-white/20">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-red-600/50 hover:text-white transition-colors border border-red-400/40"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── Bottom Nav (mobile only) ── */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border z-40 flex md:hidden shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        {bottomNavItems.map((item) => {
          const isActive = getIsActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
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
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
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
