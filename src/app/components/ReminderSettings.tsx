// src/app/components/ReminderSettings.tsx
// Per-user reminder schedules (stored in reminder_settings, sent by the
// send-reminders Edge Function). Every change is saved immediately.
import { useEffect, useState } from 'react';
import { Plus, X, Wallet, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

type ReminderType = 'transaction' | 'task';
type Frequency = 'daily' | 'weekly' | 'monthly';

interface Reminder {
  type: ReminderType;
  enabled: boolean;
  frequency: Frequency;
  days_of_week: number[];     // 0 = Sunday … 6 = Saturday
  day_of_month: number | null;
  times: string[];            // 'HH:MM'
  skip_if_logged: boolean;
}

const MAX_TIMES = 5;

const DEFAULTS: Record<ReminderType, Reminder> = {
  transaction: { type: 'transaction', enabled: false, frequency: 'daily', days_of_week: [], day_of_month: null, times: ['21:00'], skip_if_logged: true },
  task:        { type: 'task',        enabled: false, frequency: 'daily', days_of_week: [], day_of_month: null, times: ['07:00'], skip_if_logged: false },
};

const META: Record<ReminderType, { icon: React.ReactNode; title: string; description: string }> = {
  transaction: { icon: <Wallet size={15} />,      title: 'Money Reminder', description: 'A nudge to record your income and expenses.' },
  task:        { icon: <CheckSquare size={15} />, title: 'Task Reminder',  description: 'Tasks due today or overdue. Sent only when there are any.' },
};

// The server sends reminders in 15-minute slots, so only offer those times
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) =>
  `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

const WEEKDAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 0, label: 'Sun' },
];

const chipClass = (active: boolean) =>
  `px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
    active
      ? 'bg-primary text-primary-foreground border-primary dark:bg-primary/20 dark:text-primary dark:border-primary/30'
      : 'bg-white dark:bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
  }`;

const sortUnique = (times: string[]) => [...new Set(times)].sort();

export function ReminderSettings() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [reminders, setReminders] = useState(DEFAULTS);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('reminder_settings')
      .select('type, enabled, frequency, days_of_week, day_of_month, times, skip_if_logged')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (!data) return;
        setReminders(prev => {
          const next = { ...prev };
          for (const row of data) {
            next[row.type as ReminderType] = { ...row, times: row.times.map((t: string) => t.slice(0, 5)) } as Reminder;
          }
          return next;
        });
      });
  }, [userId]);

  const save = async (type: ReminderType, changes: Partial<Reminder>) => {
    const previous = reminders[type];
    const next = { ...previous, ...changes };
    setReminders(r => ({ ...r, [type]: next }));

    const { error } = await supabase.from('reminder_settings').upsert({
      user_id: userId,
      ...next,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,type' });

    if (error) {
      setReminders(r => ({ ...r, [type]: previous }));
      toast.error('Failed to save reminder. Please try again.');
    }
  };

  return (
    <div className="space-y-2">
      {(['transaction', 'task'] as const).map(type => (
        <ReminderCard key={type} reminder={reminders[type]} onChange={changes => save(type, changes)} />
      ))}
    </div>
  );
}

function ReminderCard({ reminder: r, onChange }: { reminder: Reminder; onChange: (changes: Partial<Reminder>) => void }) {
  const meta = META[r.type];

  // DB constraints: weekly needs at least one day, monthly needs a day of month
  const setFrequency = (frequency: Frequency) => onChange({
    frequency,
    days_of_week: frequency === 'weekly' && r.days_of_week.length === 0 ? [new Date().getDay()] : r.days_of_week,
    day_of_month: frequency === 'monthly' && !r.day_of_month ? new Date().getDate() : r.day_of_month,
  });

  const toggleDay = (day: number) => {
    const days = r.days_of_week.includes(day) ? r.days_of_week.filter(d => d !== day) : [...r.days_of_week, day];
    if (days.length > 0) onChange({ days_of_week: days });
  };

  const setTime = (index: number, time: string) =>
    onChange({ times: sortUnique(r.times.map((t, i) => (i === index ? time : t))) });

  // New time defaults to one hour after the latest one (wrapping past midnight)
  const addTime = () => {
    const start = TIME_OPTIONS.indexOf(r.times[r.times.length - 1]) + 4;
    const free = Array.from({ length: 96 }, (_, i) => TIME_OPTIONS[(start + i) % 96]).find(t => !r.times.includes(t))!;
    onChange({ times: sortUnique([...r.times, free]) });
  };

  const removeTime = (index: number) => onChange({ times: r.times.filter((_, i) => i !== index) });

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button type="button" role="switch" aria-checked={r.enabled}
        onClick={() => onChange({ enabled: !r.enabled })}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-muted transition-colors">
        <span className="text-primary flex-shrink-0">{meta.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground block">{meta.title}</span>
          <span className="text-xs text-muted-foreground block">{meta.description}</span>
        </span>
        <Switch checked={r.enabled} />
      </button>

      {r.enabled && (
        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-border">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Repeat</p>
            <div className="flex gap-1.5">
              {(['daily', 'weekly', 'monthly'] as const).map(f => (
                <button key={f} type="button" onClick={() => setFrequency(f)} className={`flex-1 ${chipClass(r.frequency === f)}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {r.frequency === 'weekly' && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">On</p>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(d => (
                  <button key={d.value} type="button" aria-pressed={r.days_of_week.includes(d.value)}
                    onClick={() => toggleDay(d.value)} className={chipClass(r.days_of_week.includes(d.value))}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {r.frequency === 'monthly' && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">On day</p>
              <Select value={String(r.day_of_month ?? 1)} onValueChange={v => onChange({ day_of_month: Number(v) })}>
                <SelectTrigger size="sm" className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(r.day_of_month ?? 1) > 28 && (
                <p className="text-xs text-muted-foreground">In shorter months, you'll be reminded on the last day.</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Remind me at</p>
            <div className="flex flex-wrap items-center gap-2">
              {r.times.map((t, i) => (
                <div key={t} className="flex items-center">
                  <Select value={t} onValueChange={v => setTime(i, v)}>
                    <SelectTrigger size="sm" className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {TIME_OPTIONS.map(o => (
                        <SelectItem key={o} value={o} disabled={o !== t && r.times.includes(o)}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {r.times.length > 1 && (
                    <button type="button" aria-label={`Remove ${t}`} onClick={() => removeTime(i)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {r.times.length < MAX_TIMES && (
                <button type="button" onClick={addTime}
                  className="h-8 px-2.5 flex items-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Plus size={13} /> Add time
                </button>
              )}
            </div>
          </div>

          {r.type === 'transaction' && (
            <button type="button" role="switch" aria-checked={r.skip_if_logged}
              onClick={() => onChange({ skip_if_logged: !r.skip_if_logged })}
              className="w-full flex items-center gap-3 text-left">
              <span className="flex-1 text-xs text-muted-foreground">Skip if I've already logged a transaction today</span>
              <Switch checked={r.skip_if_logged} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
