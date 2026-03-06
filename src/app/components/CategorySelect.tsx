// src/app/components/CategorySelect.tsx
// Reusable dropdown yang support parent category + subcategory
// Usage: <CategorySelect type="transaction" value={categoryId} onChange={setCategoryId} />

import { useCategories } from '../context/CategoryContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ChevronRight } from 'lucide-react';

interface CategorySelectProps {
  type: 'transaction' | 'task' | 'note';
  value: string;
  onChange: (value: string) => void;
  // Optional: filter by subtype (for transactions: 'income' | 'expense')
  subtype?: 'income' | 'expense';
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function CategorySelect({
  type,
  value,
  onChange,
  subtype,
  placeholder = 'Select category',
  disabled,
  id,
}: CategorySelectProps) {
  const { getCategoriesByType, getSubcategories } = useCategories();

  // Get parent categories, optionally filtered by subtype
  let parents = getCategoriesByType(type);
  if (subtype) {
    parents = parents.filter(p => !p.subtype || p.subtype === subtype);
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {parents.map(parent => {
          const subs = getSubcategories(parent.id);

          // Filter subs by subtype too if applicable
          const filteredSubs = subtype
            ? subs.filter(s => !s.subtype || s.subtype === subtype)
            : subs;

          return (
            <div key={parent.id}>
              {/* Parent category row */}
              <SelectItem value={parent.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: parent.color }}
                  />
                  <span>{parent.name}</span>
                </div>
              </SelectItem>

              {/* Subcategories — indented under parent */}
              {filteredSubs.map(sub => (
                <SelectItem key={sub.id} value={sub.id}>
                  <div className="flex items-center gap-2 pl-3">
                    <ChevronRight size={11} className="text-muted-foreground flex-shrink-0" />
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sub.color || parent.color }}
                    />
                    <span className="text-muted-foreground">{sub.name}</span>
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