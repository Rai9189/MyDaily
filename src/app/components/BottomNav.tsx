import { Home, CreditCard, CheckSquare, FileText, User, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();

  // 5 item: Dashboard, Transactions, Tasks, Notes, kemudian split Profile & Settings
  // Karena layar mobile sempit, gabungkan Profile+Settings jadi "Me"
  // dengan ikon User, aktif di /profile DAN /settings
  const navItems = [
    { path: '/',             icon: Home,        label: 'Dashboard' },
    { path: '/transactions', icon: CreditCard,  label: 'Transactions' },
    { path: '/tasks',        icon: CheckSquare, label: 'Tasks' },
    { path: '/notes',        icon: FileText,    label: 'Notes' },
    { path: '/settings',     icon: Settings,    label: 'Settings' },
  ];

  // Route aktif per item
  const getIsActive = (path: string) => {
    if (path === '/settings') {
      // Settings tab aktif di /settings, /categories, /trash, /profile, /accounts
      return ['/settings', '/categories', '/trash', '/profile', '/accounts'].includes(location.pathname);
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = getIsActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}