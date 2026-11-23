// GET /api/pay/verify?reference=… — called when the visitor comes back from Paystack. Asks Paystack
// directly whether the payment went through (never trusts the browser), records it once, and answers
// { status, kind }. The webhook does the same thing in the background, in case the visitor closes the tab.
import type { Env } from '../../_lib/env';
import { json, markPaid, paystackReady, paystackVerify } from '../../_lib/orders';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const reference = new URL(request.url).searchParams.get('reference') ?? '';
  if (!/^[A-Za-z0-9-]{6,80}$/.test(reference) || !paystackReady(env)) return json({ status: 'unknown' }, 400);
  const pay = await env.DB.prepare('SELECT kind, status FROM payments WHERE reference = ?').bind(reference).first<{ kind: string; status: string }>();
  if (!pay) return json({ status: 'unknown' }, 404);
  if (pay.status === 'success') return json({ status: 'success', kind: pay.kind });
  const tx = await paystackVerify(env, reference);
  if (tx?.status === 'success') {
    const r = await markPaid(env, reference, tx);
    return json({ status: r.ok ? 'success' : 'failed', kind: pay.kind });
  }
  return json({ status: tx?.status === 'abandoned' || tx?.status === 'ongoing' || tx?.status === 'pending' ? 'pending' : 'failed', kind: pay.kind });
};
