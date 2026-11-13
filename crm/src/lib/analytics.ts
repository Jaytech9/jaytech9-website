import type { Booking, Deal } from './types';
import { addDays, addMonths, dateShort, monthShort, startOfMonth, startOfWeek } from './format';
import type { Point } from '../components/charts';

export type Period = '30d' | '90d' | '12m';
export const PERIODS: { id: Period; label: string }[] = [
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
];
export const periodDays = (p: Period) => (p === '30d' ? 30 : p === '90d' ? 90 : 365);

export function range(p: Period, now = new Date()) {
  const days = periodDays(p);
  const from = addDays(now, -days);
  const prevFrom = addDays(from, -days);
  return { from, to: now, prevFrom };
}

export const inRange = (iso: string | null | undefined, from: Date, to: Date) => {
  if (!iso) return false;
  const t = Date.parse(iso);
  return t >= from.getTime() && t < to.getTime();
};

// Counts per week (30d/90d) or per month (12m), always ending with the current week/month.
export function series<T>(rows: T[], dateOf: (r: T) => string | null | undefined, p: Period, valueOf: (r: T) => number = () => 1, now = new Date()): Point[] {
  if (p === '12m') {
    const start = addMonths(startOfMonth(now), -11);
    return Array.from({ length: 12 }, (_, i) => {
      const a = addMonths(start, i), b = addMonths(start, i + 1);
      const v = rows.filter((r) => inRange(dateOf(r), a, b)).reduce((s, r) => s + valueOf(r), 0);
      return { label: monthShort(a), value: v, detail: a.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
    });
  }
  const weeks = p === '30d' ? 5 : 13;
  const start = addDays(startOfWeek(now), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, i) => {
    const a = addDays(start, 7 * i), b = addDays(a, 7);
    const v = rows.filter((r) => inRange(dateOf(r), a, b)).reduce((s, r) => s + valueOf(r), 0);
    return { label: dateShort(a), value: v, detail: `Week of ${dateShort(a)}` };
  });
}

export function monthly<T>(rows: T[], dateOf: (r: T) => string | null | undefined, valueOf: (r: T) => number, months: number, now = new Date()): Point[] {
  const start = addMonths(startOfMonth(now), -(months - 1));
  return Array.from({ length: months }, (_, i) => {
    const a = addMonths(start, i), b = addMonths(start, i + 1);
    return {
      label: monthShort(a),
      value: rows.filter((r) => inRange(dateOf(r), a, b)).reduce((s, r) => s + valueOf(r), 0),
      detail: a.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    };
  });
}

export function groupCount<T>(rows: T[], keyOf: (r: T) => string | null | undefined, top = 6): Point[] {
  const m = new Map<string, number>();
  rows.forEach((r) => { const k = keyOf(r) || 'Not given'; m.set(k, (m.get(k) ?? 0) + 1); });
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, top);
}

export const isOpenDeal = (d: Deal) => !['won', 'lost'].includes(d.stage);
export const upcoming = (b: Booking[], now = new Date(), days = 7) =>
  b.filter((x) => x.call_at && ['new', 'confirmed'].includes(x.status) && inRange(x.call_at, addDays(now, -1 / 24), addDays(now, days)))
    .sort((a, b2) => Date.parse(a.call_at!) - Date.parse(b2.call_at!));
