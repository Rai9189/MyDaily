import { Home, CreditCard, CheckSquare, FileText, Wallet, User, LogOut, Moon, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useTheme } from '../context/ThemeContext';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/transactions', icon: CreditCard, label: 'Transaksi' },
    { path: '/tasks', icon: CheckSquare, label: 'Tugas' },
    { path: '/notes', icon: FileText, label: 'Notes' },
    { path: '/accounts', icon: Wallet, label: 'Akun' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-gradient-to-b from-blue-600 to-blue-800 dark:from-gray-900 dark:to-gray-800 text-white h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-blue-500 dark:border-gray-700">
        <h1 className="text-2xl">MyDaily</h1>
        <p className="text-sm text-blue-100 dark:text-gray-400 mt-1">Kelola hidupmu dengan mudah</p>
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
                  ? 'bg-white text-blue-600 dark:bg-gray-700 dark:text-white'
                  : 'text-blue-100 hover:bg-blue-700 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle & Logout */}
      <div className="p-4 border-t border-blue-500 dark:border-gray-700 space-y-2">
        <Button
          variant="outline"
          className="w-full gap-2 bg-blue-700 border-blue-500 text-white hover:bg-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          {theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2 text-white border-red-400 hover:bg-red-600 dark:border-red-500 dark:hover:bg-red-700"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          Keluar Akun
        </Button>
      </div>
    </aside>
  );
}