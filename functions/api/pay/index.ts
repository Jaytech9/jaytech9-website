// POST /api/pay — start a Paystack payment for an order: { kind: "deposit" | "balance" }.
// The amount is worked out here from the order, never taken from the browser.
// Returns { url } — the browser goes to Paystack's secure checkout page, then comes back to /track/.
import type { Env } from '../../_lib/env';
import { tooMany } from '../../_lib/forms';
import { json, money, now, orderByToken, paystackInit, paystackReady, uuid } from '../../_lib/orders';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!paystackReady(env)) return json({ error: 'Online payment is not switched on yet. Please pay by Mobile Money and tell us on WhatsApp.' }, 503);
  if (await tooMany(env, request.headers.get('cf-connecting-ip') ?? 'unknown')) return json({ error: 'Too many requests. Please wait a minute.' }, 429);
  const o = await orderByToken(env, request.headers.get('x-order-token'));
  if (!o) return json({ error: 'Order not found.' }, 404);
  const { kind } = (await request.json().catch(() => ({}))) as { kind?: string };
  const m = money(o);
  let amount = 0;
  if (kind === 'deposit') {
    if (o.status !== 'quoted' || o.deposit_paid_at) return json({ error: 'There is no deposit to pay right now.' }, 409);
    amount = m.deposit;
  } else if (kind === 'balance') {
    if (o.status !== 'approved' || o.balance_paid_at) return json({ error: 'The balance can be paid once you approve the preview.' }, 409);
    amount = m.balance;
  } else return json({ error: 'Unknown payment.' }, 400);
  if (amount < 100) return json({ error: 'Nothing to pay.' }, 409);

  const reference = `${o.ref}-${kind === 'deposit' ? 'D' : 'B'}-${uuid().slice(0, 8)}`;
  const email = o.email || `orders+${o.ref.toLowerCase()}@jaytech9.com`;
  await env.DB.prepare("INSERT INTO payments (id, order_id, kind, amount, reference, payer_name, payer_email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(uuid(), o.id, kind, amount, reference, o.name, email, now()).run();
  try {
    const url = await paystackInit(env, {
      email, amount, reference, callback: `${new URL(request.url).origin}/track/`,
      metadata: { order_ref: o.ref, kind, custom_fields: [{ display_name: 'Order', variable_name: 'order', value: o.ref }] },
    });
    return json({ url });
  } catch (e) {
    await env.DB.prepare("UPDATE payments SET status = 'failed' WHERE reference = ?").bind(reference).run();
    return json({ error: (e as Error).message }, 502);
  }
};
