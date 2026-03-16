// src/app/components/DateRangeFilter.tsx
import { useState } from 'react';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  format, isSameDay,
} from 'date-fns';
import { Calendar, ChevronDown, X, Check } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

export type RangePreset = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

export interface DateRangeValue {
  preset: RangePreset;
  start: Date;
  end: Date;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'today',      label: 'Today'      },
  { key: 'this_week',  label: 'This Week'  },
  { key: 'this_month', label: 'This Month' },
  { key: 'this_year',  label: 'This Year'  },
];

export function getPresetRange(preset: Exclude<RangePreset, 'custom'>): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case 'today':      return { start: startOfDay(now),   end: endOfDay(now) };
    case 'this_week':  return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'this_year':  return { start: startOfYear(now),  end: endOfYear(now) };
  }
}

export function defaultDateRange(): DateRangeValue {
  return { preset: 'this_month', ...getPresetRange('this_month') };
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({
    from: value.preset === 'custom' ? value.start : undefined,
    to:   value.preset === 'custom' ? value.end   : undefined,
  });

  const handlePreset = (preset: RangePreset) => {
    if (preset === 'custom') return; // handled by button below
    onChange({ preset, ...getPresetRange(preset) });
  };

  const handleCustomApply = () => {
    if (customRange.from && customRange.to) {
      onChange({
        preset: 'custom',
        start: startOfDay(customRange.from),
        end:   endOfDay(customRange.to),
      });
      setOpen(false);
    }
  };

  const handleClear = () => {
    const def = defaultDateRange();
    onChange(def);
    setCustomRange({});
    setOpen(false);
  };

  const customLabel = value.preset === 'custom'
    ? (isSameDay(value.start, value.end)
        ? format(value.start, 'dd MMM yyyy')
        : `${format(value.start, 'dd MMM')} – ${format(value.end, 'dd MMM yyyy')}`)
    : null;

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-card border border-border rounded-lg p-1 shadow-sm">
      {/* Preset pills */}
      {PRESETS.map(preset => (
        <button
          key={preset.key}
          type="button"
          onClick={() => handlePreset(preset.key)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            value.preset === preset.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {preset.label}
        </button>
      ))}

      {/* Custom trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            value.preset === 'custom'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Calendar size={12} />
          {customLabel ?? 'Custom'}
          <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown popover */}
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            {/* Panel */}
            <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-card border border-border rounded-xl shadow-xl overflow-hidden"
              style={{ minWidth: 300 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">Custom Range</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Selected range summary */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-primary/5">
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">From</p>
                  <p className="text-sm font-semibold text-foreground">
                    {customRange.from ? format(customRange.from, 'dd MMM yyyy') : '—'}
                  </p>
                </div>
                <div className="w-6 h-px bg-border" />
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">To</p>
                  <p className="text-sm font-semibold text-foreground">
                    {customRange.to ? format(customRange.to, 'dd MMM yyyy') : '—'}
                  </p>
                </div>
              </div>

              {/* Calendar */}
              <div className="px-2 py-2">
                <DayPicker
                  mode="range"
                  selected={customRange.from ? { from: customRange.from, to: customRange.to } : undefined}
                  onSelect={r => setCustomRange({ from: r?.from, to: r?.to })}
                  numberOfMonths={1}
                  showOutsideDays
                  styles={{
                    months: { gap: '0' },
                    caption: { paddingBottom: '8px' },
                  }}
                  classNames={{
                    root: 'text-sm',
                    month: 'w-full',
                    caption: 'flex justify-center items-center relative px-2 pb-2',
                    caption_label: 'text-sm font-semibold text-foreground',
                    nav: 'flex items-center gap-1',
                    nav_button: 'h-7 w-7 bg-transparent rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors',
                    nav_button_previous: 'absolute left-1',
                    nav_button_next: 'absolute right-1',
                    table: 'w-full border-collapse',
                    head_row: 'flex',
                    head_cell: 'text-muted-foreground rounded-md flex-1 text-center text-xs font-medium py-1',
                    row: 'flex w-full mt-1',
                    cell: 'flex-1 text-center text-sm p-0 relative',
                    day: 'h-8 w-full rounded-lg flex items-center justify-center text-xs font-medium hover:bg-muted transition-colors mx-auto',
                    day_selected: 'bg-primary text-primary-foreground hover:bg-primary rounded-lg',
                    day_today: 'font-bold text-primary',
                    day_outside: 'text-muted-foreground opacity-40',
                    day_disabled: 'text-muted-foreground opacity-30',
                    day_range_middle: 'bg-primary/15 rounded-none text-foreground',
                    day_range_start: 'bg-primary text-primary-foreground rounded-l-lg rounded-r-none',
                    day_range_end: 'bg-primary text-primary-foreground rounded-r-lg rounded-l-none',
                    day_hidden: 'invisible',
                  }}
                />
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Reset to default
                </button>
                <button
                  type="button"
                  onClick={handleCustomApply}
                  disabled={!customRange.from || !customRange.to}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  <Check size={12} />
                  Apply
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}