// POST /api/donate — { amount (GH₵, whole number), name?, email, message?, anonymous? } → { url } for Paystack.
// Donations support the farmer training programme shown on /donate/. Not tied to any order.
import type { Env } from '../_lib/env';
import { tooMany } from '../_lib/forms';
import { clean, json, now, paystackInit, paystackReady, uuid } from '../_lib/orders';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!paystackReady(env)) return json({ error: 'Online giving opens very soon. Thank you for your patience.' }, 503);
  if (await tooMany(env, request.headers.get('cf-connecting-ip') ?? 'unknown')) return json({ error: 'Too many requests. Please wait a minute.' }, 429);
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const cedis = Math.round(Number(b.amount));
  if (!(cedis >= 5 && cedis <= 50_000)) return json({ error: 'Please choose an amount between GH₵ 5 and GH₵ 50,000.' }, 400);
  const email = clean(b.email, 200)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please add your email so Paystack can send your receipt.' }, 400);
  const name = b.anonymous === true ? 'Anonymous' : clean(b.name, 120);
  const reference = `JT9-GIVE-${uuid().slice(0, 12)}`;
  await env.DB.prepare("INSERT INTO payments (id, kind, amount, reference, payer_name, payer_email, message, created_at) VALUES (?, 'donation', ?, ?, ?, ?, ?, ?)")
    .bind(uuid(), cedis * 100, reference, name, email, clean(b.message, 500), now()).run();
  try {
    const url = await paystackInit(env, {
      email, amount: cedis * 100, reference, callback: `${new URL(request.url).origin}/donate/thanks/`,
      metadata: { kind: 'donation', custom_fields: [{ display_name: 'Gift', variable_name: 'gift', value: 'Farmer training programme' }] },
    });
    return json({ url });
  } catch (e) {
    await env.DB.prepare("UPDATE payments SET status = 'failed' WHERE reference = ?").bind(reference).run();
    return json({ error: (e as Error).message }, 502);
  }
};
