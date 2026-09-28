// supabase/functions/send-reminders/index.ts
// Called by pg_cron every 15 minutes. Sends push notifications for every
// reminder_settings row whose schedule falls in the current 15-minute slot
// (in the user's own timezone).
//
// Required secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
// Deploy with JWT verification OFF — access is guarded by the x-cron-secret header.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SLOT_MINUTES = 15;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface Reminder {
  id: string;
  user_id: string;
  type: 'transaction' | 'task';
  frequency: 'daily' | 'weekly' | 'monthly';
  days_of_week: number[];
  day_of_month: number | null;
  times: string[];          // 'HH:MM:SS'
  timezone: string;
  skip_if_logged: boolean;
  last_sent_at: string | null;
}

interface LocalNow {
  date: string;             // 'YYYY-MM-DD'
  year: number;
  month: number;            // 1-12
  day: number;
  weekday: number;          // 0 = Sunday
  minutes: number;          // minutes since local midnight
  startOfDay: Date;         // local midnight as an absolute instant
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toLocal(now: Date, timeZone: string): LocalNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
    }).formatToParts(now).map(p => [p.type, p.value]),
  );
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAYS.indexOf(parts.weekday),
    minutes,
    startOfDay: new Date(now.getTime() - minutes * 60_000 - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds()),
  };
}

function isScheduledToday(r: Reminder, local: LocalNow) {
  if (r.frequency === 'daily') return true;
  if (r.frequency === 'weekly') return r.days_of_week.includes(local.weekday);
  // Monthly: a day past the end of this month (e.g. 31 in April) fires on the last day
  const lastDayOfMonth = new Date(Date.UTC(local.year, local.month, 0)).getUTCDate();
  return local.day === Math.min(r.day_of_month ?? 1, lastDayOfMonth);
}

function hasTimeInCurrentSlot(times: string[], minutes: number) {
  const slotStart = minutes - (minutes % SLOT_MINUTES);
  return times.some(t => {
    const [h, m] = t.split(':').map(Number);
    const at = h * 60 + m;
    return at >= slotStart && at < slotStart + SLOT_MINUTES;
  });
}

async function buildPayload(r: Reminder, local: LocalNow) {
  if (r.type === 'transaction') {
    if (r.skip_if_logged) {
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', r.user_id)
        .is('deleted_at', null)
        .gte('created_at', local.startOfDay.toISOString());
      if ((count ?? 0) > 0) return null;
    }
    return {
      title: 'Time to log your money',
      body: "Don't forget to record today's income and expenses.",
      url: '/transactions/new',
      tag: 'reminder-transaction',
    };
  }

  const countTasks = (op: 'eq' | 'lt') =>
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', r.user_id)
      .eq('completed', false)
      .is('deleted_at', null)
      [op]('deadline', local.date);

  const [{ count: dueToday }, { count: overdue }] = await Promise.all([countTasks('eq'), countTasks('lt')]);
  if (!dueToday && !overdue) return null;

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const lines = [];
  if (dueToday) lines.push(`${plural(dueToday, 'task')} due today`);
  if (overdue) lines.push(`${plural(overdue, 'task')} overdue`);

  return { title: 'Task reminder', body: lines.join(' · '), url: '/tasks', tag: 'reminder-task' };
}

async function sendToUser(userId: string, payload: object) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  await Promise.all((subs ?? []).map(s =>
    webpush
      .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload))
      .catch(async (err: { statusCode?: number }) => {
        // 404/410: the browser dropped this subscription — clean it up
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        } else {
          console.error('Push failed', s.endpoint, err);
        }
      })
  ));
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();
  // ponytail: scans every enabled reminder each run; fine for a personal-scale
  // user base, filter by precomputed next_run_at if this ever gets slow.
  const { data: reminders, error } = await supabase
    .from('reminder_settings')
    .select('*')
    .eq('enabled', true);
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  for (const r of reminders as Reminder[]) {
    try {
      const local = toLocal(now, r.timezone);
      if (!isScheduledToday(r, local) || !hasTimeInCurrentSlot(r.times, local.minutes)) continue;
      // Guard against a retried or overlapping cron run sending twice in one slot
      if (r.last_sent_at && now.getTime() - new Date(r.last_sent_at).getTime() < SLOT_MS) continue;

      const payload = await buildPayload(r, local);
      if (!payload) continue;

      await sendToUser(r.user_id, payload);
      await supabase.from('reminder_settings').update({ last_sent_at: now.toISOString() }).eq('id', r.id);
      sent++;
    } catch (err) {
      console.error('Reminder failed', r.id, err);
    }
  }

  return Response.json({ sent });
});
