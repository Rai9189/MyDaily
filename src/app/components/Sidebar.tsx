import { Home, CreditCard, CheckSquare, FileText, Wallet, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/transactions', icon: CreditCard, label: 'Transaksi' },
    { path: '/tasks', icon: CheckSquare, label: 'Tugas' },
    { path: '/notes', icon: FileText, label: 'Notes' },
    { path: '/accounts', icon: Wallet, label: 'Akun' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl">MyDaily</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola hidupmu dengan mudah</p>
      </div>
      
      <nav className="flex-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}