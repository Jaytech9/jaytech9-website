// POST /api/order — every change the team makes to a service order. Rules for money, the deadline
// clock and what the client sees are shared with the website (functions/_lib/orders.ts), so both
// sides always agree. Body: { action, id?, ... }.
//   create        { name, phone?, email?, organisation?, service, title?, brief? }
//   quote         { id, total (GH₵), deposit_pct, turnaround_days, revisions_included, quote_note? }
//   materials     { id, ready: boolean }
//   mark_paid     { id, kind: "deposit" | "balance" }        (Mobile Money / cash received directly)
//   preview       { id, url?, message? }                    (url optional when preview files were uploaded)
//   final         { id, url? }
//   resume        { id }                                     (back to work after changes)
//   due           { id, due_at }                             (move the due date, e.g. late materials)
//   update        { id, message }                            (a note the client sees)
//   cancel        { id, reason? }
import type { Ctx } from '../_lib/env';
import { HttpError, fail, json } from '../_lib/http';
import { applyOrderPayment, clock, money, newRef, newToken, now, uuid, type OrderRow } from '../../../functions/_lib/orders';
import { fromDb } from '../_lib/tables';

const str = (v: unknown, max = 4000) => { const s = v == null ? '' : String(v).trim().slice(0, max); return s || null; };
const https = (v: unknown) => { const s = str(v, 1000); if (!s || !/^https:\/\//i.test(s)) throw new HttpError(400, 'Please paste a full link that starts with https://'); return s; };

export const onRequestPost = async (ctx: Ctx) => {
  try {
    const db = ctx.env.DB;
    const b = (await ctx.request.json()) as Record<string, unknown>;
    const who = ctx.data.user.name || ctx.data.user.email;
    const t = now();
    const note = (orderId: string, message: string, author = 'team') =>
      db.prepare('INSERT INTO order_updates (id, order_id, author, message, created_at) VALUES (?, ?, ?, ?, ?)').bind(uuid(), orderId, author, message, t);
    const log = (action: string, detail: string, id: string) =>
      db.prepare('INSERT INTO activity (id, entity, entity_id, action, detail, actor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(uuid(), 'order', id, action, detail, ctx.data.user.email, t);

    if (b.action === 'create') {
      const name = str(b.name, 120), service = str(b.service, 80);
      if (!name || !service) throw new HttpError(400, 'Add the client name and the service.');
      const phone = str(b.phone, 40), email = str(b.email, 200)?.toLowerCase() ?? null;
      const client = await db.prepare('SELECT id FROM clients WHERE (phone IS NOT NULL AND phone = ?) OR (email IS NOT NULL AND lower(email) = ?) LIMIT 1').bind(phone ?? '', email ?? '').first<{ id: string }>();
      const clientId = client?.id ?? uuid(), id = uuid();
      const stmts = [];
      if (!client) stmts.push(db.prepare("INSERT INTO clients (id, name, phone, email, organisation, service, source, marketing_opt_in, created_at) VALUES (?, ?, ?, ?, ?, ?, 'Added in CRM', 0, ?)").bind(clientId, name, phone, email, str(b.organisation, 160), service, t));
      stmts.push(db.prepare('INSERT INTO orders (id, ref, token, client_id, name, email, phone, organisation, service, title, brief, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, newRef(), newToken(), clientId, name, email, phone, str(b.organisation, 160), service, str(b.title, 160), str(b.brief), t, t));
      stmts.push(note(id, 'Order opened. We will send you a quote shortly.', 'system'), log('created', name, id));
      await db.batch(stmts);
      return json(fromDb((await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first())!), 201);
    }

    const o = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(String(b.id ?? '')).first<OrderRow>();
    if (!o) throw new HttpError(404, 'Order not found.');
    const set = (cols: Record<string, unknown>) => {
      const c = { ...cols, updated_at: t };
      return db.prepare(`UPDATE orders SET ${Object.keys(c).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).bind(...Object.values(c), o.id);
    };
    const ghs = (p: number) => `GH₵ ${(p / 100).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

    switch (b.action) {
      case 'quote': {
        if (!['requested', 'quoted'].includes(o.status)) throw new HttpError(409, 'The quote can only change before the deposit is paid.');
        const total = Math.round(Number(b.total) * 100);
        const pct = Math.round(Number(b.deposit_pct ?? 70));
        const days = Math.round(Number(b.turnaround_days));
        const revs = Math.round(Number(b.revisions_included ?? 2));
        if (!(total >= 100)) throw new HttpError(400, 'Enter the total price in GH₵.');
        if (![50, 60, 70, 100].includes(pct)) throw new HttpError(400, 'Deposit should be 50%, 60%, 70% or 100%.');
        if (!(days >= 1 && days <= 365)) throw new HttpError(400, 'Enter the delivery time in days.');
        if (!(revs >= 0 && revs <= 20)) throw new HttpError(400, 'Rounds of changes should be 0 to 20.');
        const m = money({ total, deposit_pct: pct, preview_at: null, due_at: null });
        await db.batch([
          set({ total, deposit_pct: pct, turnaround_days: days, revisions_included: revs, quote_note: str(b.quote_note, 2000), quoted_at: t, status: 'quoted' }),
          note(o.id, `Quote: ${ghs(total)} for delivery in ${days} day${days > 1 ? 's' : ''} after the deposit and materials arrive. Deposit ${pct}%: ${ghs(m.deposit)}. ${revs} rounds of changes included.`),
          log('quoted', `${o.ref} · ${ghs(total)}`, o.id),
        ]);
        break;
      }
      case 'materials': {
        const ready = b.ready === true;
        const c = clock({ ...o, materials_ready_at: ready ? t : null });
        const keepStart = o.deposit_paid_at && ready ? c : { started_at: null, due_at: null };
        await db.batch([
          set({ materials_ready_at: ready ? t : (o.started_at ? o.materials_ready_at : null), ...(o.started_at ? {} : keepStart) }),
          note(o.id, ready ? `All materials received.${o.deposit_paid_at ? ' The delivery clock has started.' : ' The clock starts once the deposit is paid.'}` : 'We still need some materials from you. Please check the messages below.'),
        ]);
        break;
      }
      case 'mark_paid': {
        const kind = b.kind === 'balance' ? 'balance' : 'deposit';
        const m = money(o);
        if (kind === 'deposit' && (o.deposit_paid_at || !['quoted', 'requested'].includes(o.status) || !o.total)) throw new HttpError(409, 'Send a quote first, or the deposit is already paid.');
        if (kind === 'balance' && (o.balance_paid_at || !['approved', 'preview', 'changes'].includes(o.status))) throw new HttpError(409, 'The balance is paid after the preview.');
        const amount = kind === 'deposit' ? m.deposit : m.balance;
        await db.prepare("INSERT INTO payments (id, order_id, kind, amount, reference, status, method, payer_name, paid_at, created_at) VALUES (?, ?, ?, ?, ?, 'success', 'manual', ?, ?, ?)")
          .bind(uuid(), o.id, kind, amount, `${o.ref}-${kind === 'deposit' ? 'D' : 'B'}-M${uuid().slice(0, 6)}`, o.name, t, t).run();
        if (kind === 'balance' && !o.approved_at) await set({ approved_at: t }).run();
        await applyOrderPayment(ctx.env, o.id, kind, t, 'manual', amount);
        await log(`${kind} paid`, `${o.ref} · ${ghs(amount)} (recorded by ${who})`, o.id).run();
        break;
      }
      case 'preview': {
        if (!o.deposit_paid_at) throw new HttpError(409, 'Record the deposit before sending a preview.');
        if (!['in_progress', 'changes', 'preview'].includes(o.status)) throw new HttpError(409, 'This order is not in progress.');
        const hasFiles = await db.prepare("SELECT 1 FROM order_files WHERE order_id = ? AND kind = 'preview' LIMIT 1").bind(o.id).first();
        const url = str(b.url, 1000) ? https(b.url) : o.preview_url;
        if (!url && !hasFiles) throw new HttpError(400, 'Upload preview files or paste a preview link first.');
        const first = !o.preview_at;
        const late = first && o.due_at && Date.parse(t) > Date.parse(o.due_at);
        await db.batch([
          set({ preview_url: url, status: 'preview', ...(first ? { preview_at: t } : {}) }),
          note(o.id, `${str(b.message, 1000) ?? 'Your preview is ready.'} Please check it and approve it, or tell us what to change.${late ? ' It came after the due date, so 10% comes off your balance.' : ''}`),
          log('preview sent', o.ref, o.id),
        ]);
        break;
      }
      case 'final': {
        // Called after uploading final files (url may be empty) or with a link.
        const url = str(b.url, 1000) ? https(b.url) : o.final_url;
        const hasFiles = await db.prepare("SELECT 1 FROM order_files WHERE order_id = ? AND kind = 'final' LIMIT 1").bind(o.id).first();
        if (!url && !hasFiles) throw new HttpError(400, 'Upload the final files or paste a link.');
        await db.batch([set({ final_url: url }), log('final files added', o.ref, o.id)]);
        if (o.status === 'completed') await note(o.id, 'Your final files are ready to download.').run();
        break;
      }
      case 'resume': {
        if (o.status !== 'changes') throw new HttpError(409, 'Only orders waiting on changes can go back to work.');
        await set({ status: 'in_progress' }).run();
        break;
      }
      case 'due': {
        const d = str(b.due_at, 40);
        if (!d || Number.isNaN(Date.parse(d))) throw new HttpError(400, 'Pick a date.');
        const iso = new Date(d).toISOString();
        await db.batch([set({ due_at: iso }), note(o.id, `New due date: ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Accra' })}.`), log('due date changed', o.ref, o.id)]);
        break;
      }
      case 'update': {
        const msg = str(b.message, 3000);
        if (!msg) throw new HttpError(400, 'Write a message.');
        await db.batch([note(o.id, msg), set({})]);
        break;
      }
      case 'cancel': {
        if (['completed', 'cancelled'].includes(o.status)) throw new HttpError(409, 'This order is already closed.');
        await db.batch([set({ status: 'cancelled' }), note(o.id, `Order cancelled.${str(b.reason, 500) ? ` ${str(b.reason, 500)}` : ''}`), log('cancelled', o.ref, o.id)]);
        break;
      }
      default:
        throw new HttpError(400, 'Unknown action.');
    }
    return json(fromDb((await db.prepare('SELECT * FROM orders WHERE id = ?').bind(o.id).first())!));
  } catch (e) { return fail(e); }
};
