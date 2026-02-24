// src/app/components/Sidebar.tsx
import { Home, CreditCard, CheckSquare, FileText, Wallet, User, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/transactions', icon: CreditCard, label: 'Transactions' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/notes', icon: FileText, label: 'Notes' },
    { path: '/accounts', icon: Wallet, label: 'Accounts' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const handleLogout = async () => {
    sessionStorage.removeItem('pinUnlocked');
    await signOut();
    navigate('/login');
  };

  return (
    <aside
      className="hidden md:flex md:flex-col w-64 h-screen fixed left-0 top-0"
      style={{ background: 'linear-gradient(to bottom, var(--primary), color-mix(in srgb, var(--primary) 80%, black))' }}
    >
      <div className="p-5 border-b border-white/20">
        <img
          src="/logo.png"
          alt="MyDaily"
          className="w-full h-auto object-contain dark:invert"
        />
      </div>

      <nav className="flex-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
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

      {/* Sign Out — hanya muncul di desktop (sidebar) */}
      <div className="p-4 border-t border-white/20">
        <Button
          variant="outline"
          className="w-full gap-2 text-white border-red-400/60 hover:bg-red-600/70 bg-transparent"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}