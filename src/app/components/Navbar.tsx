// src/app/components/Navbar.tsx
import { useState } from 'react';
import { Home, CreditCard, CheckSquare, FileText, Wallet, User, LogOut, Settings, Menu, X } from 'lucide-react';
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

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const getIsActive = (path: string) => {
    if (path === '/settings') return ['/settings', '/categories', '/trash'].includes(location.pathname);
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getPageTitle = () => {
    if (location.pathname === '/trash')      return 'Trash';
    if (location.pathname === '/categories') return 'Categories';
    if (location.pathname === '/settings')   return 'Settings';
    if (location.pathname === '/transactions/new')              return 'New Transaction';
    if (location.pathname.startsWith('/transactions/'))         return 'Transaction Detail';
    if (location.pathname === '/tasks/new')                     return 'New Task';
    if (location.pathname.startsWith('/tasks/'))                return 'Task Detail';
    if (location.pathname === '/notes/new')                     return 'New Note';
    if (location.pathname.startsWith('/notes/'))                return 'Note Detail';
    if (location.pathname.startsWith('/accounts/'))             return 'Account Detail';
    const match = navItems.find(item => {
      if (item.path === '/') return location.pathname === '/';
      return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    });
    return match?.label ?? 'Dashboard';
  };

  const handleLogout = async () => {
    setOpen(false);
    sessionStorage.removeItem('pinUnlocked');
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* ── Top Navbar ── */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-primary flex items-center px-5 z-50 shadow-md">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-white p-2 rounded-lg hover:bg-white/15 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={26} />
        </button>
        <span className="text-white font-bold text-xl tracking-wide ml-3">{getPageTitle()}</span>
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
        {/* Drawer header */}
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

        {/* Nav items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = getIsActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
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
        </nav>

        {/* Sign out */}
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
    </>
  );
}