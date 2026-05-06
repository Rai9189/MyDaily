// src/app/hooks/useViewPreferences.ts
import { useState, useEffect } from 'react';

type ViewMode = 'list' | 'card';
type ItemsPerPage = number | 'all';

interface ViewPreferences {
  itemsPerPage: ItemsPerPage;
  viewMode: ViewMode;
}

const DEFAULTS: Record<string, ViewPreferences> = {
  transactions: { itemsPerPage: 20, viewMode: 'list' },
  tasks:        { itemsPerPage: 20, viewMode: 'list' },
  notes:        { itemsPerPage: 20, viewMode: 'card' },
};

function isMobile() {
  return !window.matchMedia('(min-width: 768px)').matches;
}

function getStorageKey(page: string) {
  return `mydaily_view_prefs_${page}`;
}

function loadPrefs(page: string): ViewPreferences {
  try {
    const raw = localStorage.getItem(getStorageKey(page));
    if (!raw) return DEFAULTS[page] ?? { itemsPerPage: 20, viewMode: 'list' };
    const parsed = JSON.parse(raw);
    return {
      itemsPerPage: parsed.itemsPerPage ?? DEFAULTS[page]?.itemsPerPage ?? 20,
      viewMode:     parsed.viewMode     ?? DEFAULTS[page]?.viewMode     ?? 'list',
    };
  } catch {
    return DEFAULTS[page] ?? { itemsPerPage: 20, viewMode: 'list' };
  }
}

function savePrefs(page: string, prefs: ViewPreferences) {
  try {
    localStorage.setItem(getStorageKey(page), JSON.stringify(prefs));
  } catch {
    // localStorage not available (e.g. strict private mode)
  }
}

export function useViewPreferences(page: 'transactions' | 'tasks' | 'notes') {
  const [itemsPerPage, setItemsPerPageState] = useState<ItemsPerPage>(() => {
    // Mobile always shows all items — no pagination
    if (isMobile()) return 'all';
    return loadPrefs(page).itemsPerPage;
  });

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (isMobile()) return 'card';
    return loadPrefs(page).viewMode;
  });

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        // Shrunk to mobile: force card view, show all items
        setViewModeState('card');
        setItemsPerPageState('all');
      } else {
        // Expanded to desktop: restore saved preferences
        const prefs = loadPrefs(page);
        setViewModeState(prefs.viewMode);
        setItemsPerPageState(prefs.itemsPerPage);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [page]);

  const setItemsPerPage = (value: ItemsPerPage) => {
    setItemsPerPageState(value);
    // Only persist on desktop — mobile is always 'all'
    if (!isMobile()) {
      const current = loadPrefs(page);
      savePrefs(page, { ...current, itemsPerPage: value });
    }
  };

  const setViewMode = (value: ViewMode) => {
    setViewModeState(value);
    if (!isMobile()) {
      const current = loadPrefs(page);
      savePrefs(page, { ...current, viewMode: value });
    }
  };

  return { itemsPerPage, setItemsPerPage, viewMode, setViewMode };
}
