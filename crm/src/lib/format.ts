// All dates come from the real clock and are shown in Ghana time.
export const TZ = 'Africa/Accra';
const locale = 'en-GB';

export const money = (n: number | null | undefined, compact = false) =>
  'GH₵ ' +
  new Intl.NumberFormat('en-GH', compact && Math.abs(n ?? 0) >= 100000
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { maximumFractionDigits: 0 }).format(n ?? 0);

export const num = (n: number) => new Intl.NumberFormat('en-GH').format(n);

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: TZ, ...o });
export const dateLong = (d: Date | string) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
export const dateShort = (d: Date | string) => fmt({ day: 'numeric', month: 'short' }).format(new Date(d));
export const dateMed = (d: Date | string) => fmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));
export const time = (d: Date | string) => fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));
export const weekday = (d: Date | string) => fmt({ weekday: 'short' }).format(new Date(d));
export const monthShort = (d: Date | string) => fmt({ month: 'short' }).format(new Date(d));

// "Today, 10:00", "Tomorrow, 14:00", "Mon 18 Nov, 09:00"
export function when(d: Date | string, now = new Date()) {
  const day = dayKey(d), today = dayKey(now);
  const diff = Math.round((Date.parse(day) - Date.parse(today)) / 86400000);
  const t = time(d);
  if (diff === 0) return `Today, ${t}`;
  if (diff === 1) return `Tomorrow, ${t}`;
  if (diff === -1) return `Yesterday, ${t}`;
  return `${weekday(d)} ${dateShort(d)}, ${t}`;
}

// "just now", "5 min ago", "3 hours ago", "2 days ago", "in 3 days"
export function ago(d: Date | string, now = new Date()) {
  const s = (new Date(d).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const a = Math.abs(s);
  if (a < 45) return 'just now';
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
  return dateMed(d);
}

// YYYY-MM-DD for the day in Ghana
export const dayKey = (d: Date | string) => fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d)).split('/').reverse().join('-');

export function greeting(now = new Date()) {
  const h = Number(fmt({ hour: 'numeric', hour12: false }).format(now));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// Monday 00:00 of the week containing d (Ghana = UTC, so UTC maths is exact)
export function startOfWeek(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const wd = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - wd);
  return x;
}
export const startOfMonth = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
export const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));
