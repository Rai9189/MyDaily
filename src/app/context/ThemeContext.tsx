import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ✅ FIX: Helper untuk resolve theme 'system' ke 'light'/'dark' aktual
function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

// Keeps the mobile status bar / task-switcher chrome in sync with the app's
// own theme choice (which can differ from the OS setting), not just at load.
function syncThemeColorMeta(resolved: 'light' | 'dark') {
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#17171a' : '#f4f4f5');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // ✅ FIX: Support 'system' sebagai nilai theme
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const resolved = getResolvedTheme(theme);

    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    syncThemeColorMeta(resolved);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ✅ FIX: Listen perubahan system preference saat theme = 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = document.documentElement;
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      syncThemeColorMeta(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}