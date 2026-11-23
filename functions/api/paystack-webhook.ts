// POST /api/paystack-webhook — Paystack calls this after each payment.
// Set it in Paystack → Settings → API Keys & Webhooks → Webhook URL: https://jaytech9.com/api/paystack-webhook
// We check Paystack's signature, then confirm with Paystack's API before recording anything.
import type { Env } from '../_lib/env';
import { markPaid, paystackSignatureOk, paystackVerify } from '../_lib/orders';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const raw = await request.text();
  if (!(await paystackSignatureOk(env, raw, request.headers.get('x-paystack-signature')))) return new Response('bad signature', { status: 401 });
  try {
    const evt = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
    if (evt.event === 'charge.success' && evt.data?.reference) {
      const tx = await paystackVerify(env, evt.data.reference);
      if (tx?.status === 'success') await markPaid(env, evt.data.reference, tx);
    }
  } catch (e) { console.error('webhook', (e as Error).message); }
  return new Response('ok');   // always 200 once the signature is good, so Paystack does not retry forever
};
