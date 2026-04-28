// src/app/hooks/useViewPreferences.ts
import { useState, useEffect } from 'react';

type ViewMode = 'list' | 'card';
type ItemsPerPage = number | 'all';

interface ViewPreferences {
  itemsPerPage: ItemsPerPage;
  viewMode: ViewMode;
}

const DEFAULTS: Record<string, ViewPreferences> = {
  transactions: { itemsPerPage: 10, viewMode: 'list' },
  tasks:        { itemsPerPage: 10, viewMode: 'list' },
  notes:        { itemsPerPage: 10, viewMode: 'card' },
};

function getStorageKey(page: string) {
  return `mydaily_view_prefs_${page}`;
}

function loadPrefs(page: string): ViewPreferences {
  try {
    const raw = localStorage.getItem(getStorageKey(page));
    if (!raw) return DEFAULTS[page] ?? { itemsPerPage: 10, viewMode: 'list' };
    const parsed = JSON.parse(raw);
    return {
      itemsPerPage: parsed.itemsPerPage ?? DEFAULTS[page]?.itemsPerPage ?? 10,
      viewMode:     parsed.viewMode     ?? DEFAULTS[page]?.viewMode     ?? 'list',
    };
  } catch {
    return DEFAULTS[page] ?? { itemsPerPage: 10, viewMode: 'list' };
  }
}

function savePrefs(page: string, prefs: ViewPreferences) {
  try {
    localStorage.setItem(getStorageKey(page), JSON.stringify(prefs));
  } catch {
    // localStorage tidak tersedia (misal private mode yang ketat)
  }
}

export function useViewPreferences(page: 'transactions' | 'tasks' | 'notes') {
  const isMobile = () => !window.matchMedia('(min-width: 768px)').matches;

  const [itemsPerPage, setItemsPerPageState] = useState<ItemsPerPage>(() => {
    return loadPrefs(page).itemsPerPage;
  });

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Mobile selalu card, tapi itemsPerPage tetap dari localStorage
    if (isMobile()) return 'card';
    return loadPrefs(page).viewMode;
  });

  // Listener resize: paksa card di mobile
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        setViewModeState('card');
      } else {
        // Kembali ke desktop: restore preferensi tersimpan
        setViewModeState(loadPrefs(page).viewMode);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [page]);

  const setItemsPerPage = (value: ItemsPerPage) => {
    setItemsPerPageState(value);
    const current = loadPrefs(page);
    savePrefs(page, { ...current, itemsPerPage: value });
  };

  const setViewMode = (value: ViewMode) => {
    setViewModeState(value);
    // Hanya simpan kalau desktop (mobile tidak perlu simpan karena selalu card)
    if (!isMobile()) {
      const current = loadPrefs(page);
      savePrefs(page, { ...current, viewMode: value });
    }
  };

  return { itemsPerPage, setItemsPerPage, viewMode, setViewMode };
}