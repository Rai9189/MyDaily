// src/app/hooks/useTransactionTemplates.ts
import { useState, useCallback } from 'react';

export interface TransactionTemplate {
  id: string;
  name: string;
  accountId: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  subcategoryId?: string | null;
  description?: string;
  createdAt: string;
}

const STORAGE_KEY = 'mydaily_tx_templates';
const MAX_TEMPLATES = 10;

function load(): TransactionTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TransactionTemplate[]) : [];
  } catch {
    return [];
  }
}

function persist(templates: TransactionTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function useTransactionTemplates() {
  const [templates, setTemplates] = useState<TransactionTemplate[]>(load);

  const saveTemplate = useCallback((
    name: string,
    data: Omit<TransactionTemplate, 'id' | 'createdAt' | 'name'>
  ) => {
    const newTpl: TransactionTemplate = {
      ...data,
      id: `tpl_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    };
    setTemplates(prev => {
      const updated = [newTpl, ...prev].slice(0, MAX_TEMPLATES);
      persist(updated);
      return updated;
    });
    return newTpl;
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  return { templates, saveTemplate, deleteTemplate };
}
