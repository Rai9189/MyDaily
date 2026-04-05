// src/app/components/CategorySelect.tsx
// Grouped category dropdown: parent → subcategory dengan indent
// Dipakai di TransactionDetail, TaskDetail, NoteDetail

import { useMemo } from 'react';
import { Category } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface CategorySelectProps {
  categories: Category[];           // semua category (parent + sub) untuk type ini
  value: string;                    // categoryId atau subcategoryId yang terpilih
  onChange: (categoryId: string, subcategoryId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Value yang disimpan di Select adalah composite key:
 *   "parent:{parentId}"      → user pilih parent (subcategoryId = null)
 *   "sub:{subcategoryId}"    → user pilih subcategory
 *
 * onChange dipanggil dengan (categoryId, subcategoryId):
 *   - pilih parent  → (parentId, null)
 *   - pilih sub     → (parentId, subcategoryId)
 */
export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = 'Select category',
  disabled = false,
  className,
  id,
}: CategorySelectProps) {
  const parents = useMemo(
    () => categories.filter(c => !c.parentId),
    [categories],
  );

  const getSubcategories = (parentId: string) =>
    categories.filter(c => c.parentId === parentId);

  // Derive select value string dari value (categoryId) + subcategoryId
  // value prop berisi categoryId; kita perlu tahu apakah itu parent atau sub
  const selectValue = useMemo(() => {
    if (!value) return '';
    const cat = categories.find(c => c.id === value);
    if (!cat) return '';
    if (cat.parentId) return `sub:${cat.id}`;
    return `parent:${cat.id}`;
  }, [value, categories]);

  const handleChange = (raw: string) => {
    if (!raw) return;
    if (raw.startsWith('parent:')) {
      const parentId = raw.replace('parent:', '');
      onChange(parentId, null);
    } else if (raw.startsWith('sub:')) {
      const subId = raw.replace('sub:', '');
      const sub = categories.find(c => c.id === subId);
      if (sub?.parentId) onChange(sub.parentId, subId);
    }
  };

  // Label untuk trigger
  const triggerLabel = useMemo(() => {
    if (!value) return null;
    const cat = categories.find(c => c.id === value);
    if (!cat) return null;
    if (cat.parentId) {
      const parent = categories.find(c => c.id === cat.parentId);
      return (
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || parent?.color }} />
          <span className="text-muted-foreground text-xs">{parent?.name}</span>
          <span className="text-muted-foreground text-xs">/</span>
          <span>{cat.name}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
        <span>{cat.name}</span>
      </div>
    );
  }, [value, categories]);

  return (
    <Select
      value={selectValue}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className}>
        {triggerLabel ?? <SelectValue placeholder={placeholder} />}
      </SelectTrigger>
      <SelectContent>
        {parents.map(parent => {
          const subs = getSubcategories(parent.id);
          return (
            <div key={parent.id}>
              {/* Parent item */}
              <SelectItem value={`parent:${parent.id}`}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: parent.color }} />
                  <span className="font-medium">{parent.name}</span>
                </div>
              </SelectItem>

              {/* Subcategory items — indented */}
              {subs.map(sub => (
                <SelectItem key={sub.id} value={`sub:${sub.id}`}>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-muted-foreground text-xs">└</span>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color || parent.color }} />
                    <span className="text-sm">{sub.name}</span>
                  </div>
                </SelectItem>
              ))}
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );
}