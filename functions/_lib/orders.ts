// Shared rules for service orders: money, the deadline clock, what a client may see, and Paystack.
// Money is always in pesewas (GH₵ 1 = 100). Amounts are worked out here on the server, never taken
// from the browser.
import type { Env } from './env';

export const now = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();
const DAY = 86_400_000;

export interface OrderRow {
  id: string; ref: string; token: string; client_id: string | null; name: string; email: string | null; phone: string | null;
  organisation: string | null; service: string | null; title: string | null; brief: string | null; materials_link: string | null;
  wanted_by: string | null; status: string; currency: string; total: number; deposit_pct: number; turnaround_days: number | null;
  revisions_included: number; revisions_used: number; quote_note: string | null; quoted_at: string | null;
  deposit_paid_at: string | null; materials_ready_at: string | null; started_at: string | null; due_at: string | null;
  preview_url: string | null; preview_at: string | null; final_url: string | null; approved_at: string | null;
  balance_paid_at: string | null; completed_at: string | null; review_rating: number | null; review_message: string | null;
  consent_review: number; consent_portfolio: number; reviewed_at: string | null; created_at: string; updated_at: string;
}

/** Deposit, late discount and balance for an order. Late = first preview after the due date → 10% off the balance. */
export function money(o: Pick<OrderRow, 'total' | 'deposit_pct' | 'preview_at' | 'due_at'>) {
  const deposit = Math.round((o.total * o.deposit_pct) / 100);
  const fullBalance = o.total - deposit;
  const late = !!(o.preview_at && o.due_at && Date.parse(o.preview_at) > Date.parse(o.due_at));
  const lateDiscount = late ? Math.round(fullBalance * 0.1) : 0;
  return { deposit, fullBalance, late, lateDiscount, balance: fullBalance - lateDiscount };
}

/** The deadline clock starts when BOTH the deposit is paid and all materials have arrived. */
export function clock(o: Pick<OrderRow, 'deposit_paid_at' | 'materials_ready_at' | 'turnaround_days'>) {
  if (!o.deposit_paid_at || !o.materials_ready_at) return { started_at: null, due_at: null };
  const start = Math.max(Date.parse(o.deposit_paid_at), Date.parse(o.materials_ready_at));
  return {
    started_at: new Date(start).toISOString(),
    due_at: o.turnaround_days ? new Date(start + o.turnaround_days * DAY).toISOString() : null,
  };
}

const rand = (bytes: number) => crypto.getRandomValues(new Uint8Array(bytes));
/** 32-character secret for the client's private link (192 bits). */
export const newToken = () => btoa(String.fromCharCode(...rand(24))).replace(/\+/g, '-').replace(/\//g, '_');
/** Short order reference clients can read out on the phone, e.g. JT9-7K4Q2M (no 0/O/1/I). */
export function newRef() {
  const abc = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return 'JT9-' + Array.from(rand(6), (b) => abc[b % abc.length]).join('');
}

export async function orderByToken(env: Env, token: string | null) {
  if (!token || !/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  return env.DB.prepare('SELECT * FROM orders WHERE token = ?').bind(token).first<OrderRow>();
}

/** Only what the client may see. No internal notes, no client id. */
export async function publicView(env: Env, o: OrderRow) {
  const [updates, payments, files] = await env.DB.batch([
    env.DB.prepare("SELECT author, message, created_at FROM order_updates WHERE order_id = ? ORDER BY created_at DESC LIMIT 100").bind(o.id),
    env.DB.prepare("SELECT kind, amount, status, method, paid_at FROM payments WHERE order_id = ? AND status = 'success' ORDER BY paid_at").bind(o.id),
    env.DB.prepare('SELECT name, size FROM order_files WHERE order_id = ? ORDER BY created_at').bind(o.id),
  ]);
  const m = money(o);
  const showPreview = ['preview', 'changes', 'approved', 'completed'].includes(o.status);
  return {
    ref: o.ref, name: o.name, organisation: o.organisation, service: o.service, title: o.title, brief: o.brief,
    status: o.status, currency: o.currency, total: o.total, deposit_pct: o.deposit_pct,
    deposit: m.deposit, balance: m.balance, late_discount: m.lateDiscount, late: m.late,
    quote_note: o.quote_note, turnaround_days: o.turnaround_days, revisions_included: o.revisions_included,
    revisions_used: o.revisions_used, deposit_paid: !!o.deposit_paid_at, materials_ready: !!o.materials_ready_at,
    started_at: o.started_at, due_at: o.due_at, wanted_by: o.wanted_by, materials_link: o.materials_link,
    preview_url: showPreview ? o.preview_url : null,
    final_url: o.status === 'completed' ? o.final_url : null,
    reviewed: !!o.reviewed_at, created_at: o.created_at,
    can_pay: paystackReady(env),
    updates: updates.results, payments: payments.results, files: files.results,
  };
}
export const paystackReady = (env: Env) => !!env.PAYSTACK_SECRET_KEY;

// ---------- Paystack ----------
const PAYSTACK = 'https://api.paystack.co';

export async function paystackInit(env: Env, p: { email: string; amount: number; reference: string; callback: string; metadata: Record<string, unknown> }) {
  const res = await fetch(`${PAYSTACK}/transaction/initialize`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: p.email, amount: p.amount, currency: 'GHS', reference: p.reference, callback_url: p.callback,
      channels: ['mobile_money', 'card', 'bank'], metadata: p.metadata,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: { authorization_url?: string } };
  if (!res.ok || !body.status || !body.data?.authorization_url) throw new Error(body.message || 'Payment could not be started.');
  return body.data.authorization_url;
}

export async function paystackVerify(env: Env, reference: string) {
  const res = await fetch(`${PAYSTACK}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    status?: boolean; data?: { status?: string; amount?: number; currency?: string; channel?: string; paid_at?: string; reference?: string };
  };
  return body.status ? body.data ?? null : null;
}

/** Paystack signs each webhook with HMAC-SHA512 of the raw body, using the secret key. */
export async function paystackSignatureOk(env: Env, raw: string, signature: string | null) {
  if (!signature || !env.PAYSTACK_SECRET_KEY) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PAYSTACK_SECRET_KEY), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/**
 * Record a successful payment once (safe to call from both the redirect and the webhook) and move the
 * order forward. Checks the amount and currency Paystack reports against what we expected.
 */
export async function markPaid(env: Env, reference: string, info: { amount?: number; currency?: string; channel?: string; paid_at?: string }) {
  const pay = await env.DB.prepare('SELECT * FROM payments WHERE reference = ?').bind(reference)
    .first<{ id: string; order_id: string | null; kind: string; amount: number; currency: string; status: string }>();
  if (!pay) return { ok: false as const, reason: 'unknown reference' };
  if (pay.status === 'success') return { ok: true as const, pay, already: true };
  if ((info.amount ?? 0) < pay.amount || (info.currency && info.currency !== pay.currency)) {
    await env.DB.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").bind(pay.id).run();
    return { ok: false as const, reason: 'amount mismatch' };
  }
  const paidAt = info.paid_at ? new Date(info.paid_at).toISOString() : now();
  const done = await env.DB.prepare("UPDATE payments SET status = 'success', channel = ?, paid_at = ? WHERE id = ? AND status != 'success'")
    .bind(info.channel ?? null, paidAt, pay.id).run();
  if (!done.meta.changes) return { ok: true as const, pay, already: true };
  if (pay.order_id) await applyOrderPayment(env, pay.order_id, pay.kind, paidAt, 'paystack', pay.amount);
  return { ok: true as const, pay, already: false };
}

export async function applyOrderPayment(env: Env, orderId: string, kind: string, paidAt: string, method: string, amount: number) {
  const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first<OrderRow>();
  if (!o) return;
  const ghs = `GH₵ ${(amount / 100).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
  if (kind === 'deposit' && !o.deposit_paid_at) {
    const c = clock({ ...o, deposit_paid_at: paidAt });
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET deposit_paid_at = ?, started_at = ?, due_at = ?, status = CASE WHEN status IN ('requested','quoted') THEN 'in_progress' ELSE status END, updated_at = ? WHERE id = ?")
        .bind(paidAt, c.started_at, c.due_at, now(), o.id),
      env.DB.prepare("INSERT INTO order_updates (id, order_id, author, message, created_at) VALUES (?, ?, 'system', ?, ?)")
        .bind(uuid(), o.id, `Deposit of ${ghs} received${method === 'paystack' ? ' through Paystack' : ''}. ${o.materials_ready_at ? 'Work has started.' : 'Work starts as soon as all your materials are in.'}`, now()),
    ]);
  }
  if (kind === 'balance' && !o.balance_paid_at) {
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET balance_paid_at = ?, completed_at = ?, status = 'completed', updated_at = ? WHERE id = ?").bind(paidAt, paidAt, now(), o.id),
      env.DB.prepare("INSERT INTO order_updates (id, order_id, author, message, created_at) VALUES (?, ?, 'system', ?, ?)")
        .bind(uuid(), o.id, `Balance of ${ghs} received. Your final files are ready to download. Thank you!`, now()),
    ]);
  }
}

export const clean = (v: unknown, max = 2000) => {
  const s = v == null ? '' : String(v).trim().slice(0, max);
  return s || null;
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
