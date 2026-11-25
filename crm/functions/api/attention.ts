// POST /api/attention → { items } — everything in the CRM that is waiting for the team, newest first.
// The top bar checks this every minute: new items ring a soft chime and show a desktop notification.
import type { Ctx } from '../_lib/env';
import { fail, json } from '../_lib/http';

export type Attention = {
  key: string;            // stable id, so the browser knows what it has already announced
  kind: 'order' | 'message' | 'booking' | 'enquiry' | 'review' | 'payment';
  title: string;
  detail: string;
  href: string;
  at: string;
  urgent?: boolean;
};

const HOUR = 3600_000;
const short = (t: string | null | undefined, n = 90) => (t ?? '').replace(/\s+/g, ' ').trim().slice(0, n) + ((t ?? '').length > n ? '…' : '');

export const onRequestPost = async (ctx: Ctx) => {
  try {
    const DB = ctx.env.DB;
    const now = Date.now();
    const items: Attention[] = [];
    const all = async <T,>(sql: string) => {
      try { return (await DB.prepare(sql).all<T>()).results; } catch (e) { if (String(e).includes('no such table')) return [] as T[]; throw e; }
    };

    type O = { id: string; ref: string; name: string; title: string | null; service: string | null; status: string; created_at: string; updated_at: string; deposit_paid_at: string | null; materials_ready_at: string | null; due_at: string | null; preview_at: string | null; balance_paid_at: string | null };
    const orders = await all<O>("SELECT id, ref, name, title, service, status, created_at, updated_at, deposit_paid_at, materials_ready_at, due_at, preview_at, balance_paid_at FROM orders WHERE status NOT IN ('completed', 'cancelled')");
    for (const o of orders) {
      const what = o.title || o.service || 'order';
      const href = `/orders?open=${o.id}`;
      if (o.status === 'requested')
        items.push({ key: `order-new-${o.id}`, kind: 'order', title: `New order ${o.ref}: send a quote`, detail: `${o.name} · ${what}`, href, at: o.created_at, urgent: true });
      if (o.status === 'changes')
        items.push({ key: `order-changes-${o.id}-${o.updated_at}`, kind: 'order', title: `${o.ref}: client asked for changes`, detail: `${o.name} · ${what}`, href, at: o.updated_at, urgent: true });
      if (o.status === 'in_progress' && o.deposit_paid_at && !o.materials_ready_at)
        items.push({ key: `order-materials-${o.id}`, kind: 'order', title: `${o.ref}: deposit paid, confirm materials`, detail: `${o.name} · mark materials received to start the clock`, href, at: o.deposit_paid_at });
      if (o.status === 'in_progress' && o.due_at && !o.preview_at) {
        const left = new Date(o.due_at).getTime() - now;
        if (left < 24 * HOUR)
          items.push({ key: `order-due-${o.id}-${left < 0 ? 'late' : 'soon'}`, kind: 'order', title: left < 0 ? `${o.ref}: preview is overdue (10% off applies)` : `${o.ref}: preview due within 24 hours`, detail: `${o.name} · ${what}`, href, at: o.due_at, urgent: true });
      }
      if (o.status === 'approved' && o.balance_paid_at)
        items.push({ key: `order-final-${o.id}`, kind: 'payment', title: `${o.ref}: balance paid, send the final files`, detail: `${o.name} · ${what}`, href, at: o.balance_paid_at, urgent: true });
    }

    // Client messages the team hasn't answered yet (includes "I've paid by bank transfer").
    type M = { id: string; order_id: string; message: string; created_at: string; ref: string; name: string };
    const msgs = await all<M>(`
      SELECT u.id, u.order_id, u.message, u.created_at, o.ref, o.name FROM order_updates u JOIN orders o ON o.id = u.order_id
      WHERE u.author = 'client' AND o.status != 'cancelled'
        AND u.created_at > COALESCE((SELECT MAX(t.created_at) FROM order_updates t WHERE t.order_id = u.order_id AND t.author = 'team'), '')
      ORDER BY u.created_at DESC LIMIT 30`);
    for (const m of msgs) {
      const bank = /bank transfer/i.test(m.message);
      items.push({ key: `msg-${m.id}`, kind: bank ? 'payment' : 'message', title: bank ? `${m.ref}: says they paid by bank transfer, check CalBank` : `${m.ref}: message from ${m.name}`, detail: short(m.message), href: `/orders?open=${m.order_id}`, at: m.created_at, urgent: bank });
    }

    type B = { id: string; name: string; service: string | null; call_at: string | null; status: string; created_at: string };
    for (const b of await all<B>("SELECT id, name, service, call_at, status, created_at FROM bookings WHERE status IN ('new', 'confirmed')")) {
      if (b.status === 'new') items.push({ key: `booking-${b.id}`, kind: 'booking', title: `New booking from ${b.name}: confirm it`, detail: `${b.service ?? 'Free call'}${b.call_at ? ' · ' + b.call_at.slice(0, 16).replace('T', ' ') : ''}`, href: '/bookings', at: b.created_at });
      if (b.call_at) {
        const left = new Date(b.call_at).getTime() - now;
        if (left > -15 * 60_000 && left < HOUR)
          items.push({ key: `call-${b.id}`, kind: 'booking', title: left > 0 ? `Call with ${b.name} in ${Math.max(1, Math.round(left / 60_000))} min` : `Call with ${b.name} is starting now`, detail: b.service ?? 'Free call', href: '/bookings', at: b.call_at, urgent: true });
      }
    }

    type E = { id: string; name: string; message: string | null; needs: string | null; created_at: string };
    for (const e of await all<E>("SELECT id, name, message, needs, created_at FROM enquiries WHERE status = 'new'"))
      items.push({ key: `enq-${e.id}`, kind: 'enquiry', title: `New enquiry from ${e.name}`, detail: short(e.message || e.needs), href: '/enquiries', at: e.created_at });

    type R = { id: string; name: string; rating: number; created_at: string };
    for (const r of await all<R>("SELECT id, name, rating, created_at FROM reviews WHERE status = 'pending'"))
      items.push({ key: `review-${r.id}`, kind: 'review', title: `Review to approve from ${r.name}`, detail: `${'★'.repeat(r.rating || 0)}`, href: '/reviews', at: r.created_at });

    items.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || b.at.localeCompare(a.at));
    return json({ items, checked_at: new Date(now).toISOString() });
  } catch (e) { return fail(e); }
};
