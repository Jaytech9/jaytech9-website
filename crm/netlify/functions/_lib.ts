// Shared helpers for the CRM's server functions. Secrets live only in Netlify environment variables.
import { createClient } from '@supabase/supabase-js';

export const admin = () => {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not set up on the server yet');
  return createClient(url, key, { auth: { persistSession: false } });
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Only signed-in staff may call these functions.
export async function requireStaff(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Please sign in again'), { status: 401 });
  const sb = admin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw Object.assign(new Error('Please sign in again'), { status: 401 });
  const { data: staff } = await sb.from('staff').select('id, role').eq('id', data.user.id).maybeSingle();
  if (!staff) throw Object.assign(new Error('Not a staff account'), { status: 403 });
  return { sb, staff };
}

export const fail = (e: unknown) => json({ error: (e as Error).message }, (e as { status?: number }).status ?? 500);

// --- Messaging ---------------------------------------------------------------
type Client = { id: string; name: string; phone: string | null; email: string | null; service: string | null; marketing_opt_in: boolean };
type Spec = { type: 'opted_in' } | { type: 'client'; client_id: string } | { type: 'service'; service: string };
export type Campaign = { id: string; channel: 'sms' | 'whatsapp' | 'email'; kind: 'promotion' | 'update'; audience_spec: Spec; subject: string | null; message: string };

export const OPT_OUT = 'Reply STOP to opt out.';

export function intl(phone?: string | null) {
  if (!phone) return '';
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = '233' + d.slice(1);
  return d;
}

export async function recipients(sb: ReturnType<typeof admin>, c: Campaign) {
  const { data, error } = await sb.from('clients').select('id, name, phone, email, service, marketing_opt_in');
  if (error) throw error;
  let list = (data ?? []) as Client[];
  const s = c.audience_spec;
  if (s.type === 'client') list = list.filter((x) => x.id === s.client_id);
  if (s.type === 'service') list = list.filter((x) => x.service === s.service);
  // Promotions only ever reach clients who agreed. Enforced here, not just in the browser.
  if (c.kind === 'promotion' || s.type !== 'client') list = list.filter((x) => x.marketing_opt_in);
  return list.filter((x) => (c.channel === 'email' ? !!x.email : !!x.phone));
}

const personalise = (t: string, name: string) => t.split('[first name]').join(name.split(' ')[0]);

async function sendSms(to: string, message: string) {
  const key = process.env.ARKESEL_API_KEY;
  if (!key) throw new Error('SMS is not set up yet (ARKESEL_API_KEY missing)');
  const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ sender: process.env.SMS_SENDER_ID ?? 'JayTech9', message, recipients: [to] }),
  });
  if (!res.ok) throw new Error(`SMS provider said ${res.status}`);
}

async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Email is not set up yet (RESEND_API_KEY missing)');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? 'JayTech9 <hello@jaytech9.com>', to, subject, text }),
  });
  if (!res.ok) throw new Error(`Email provider said ${res.status}`);
}

export async function deliver(sb: ReturnType<typeof admin>, c: Campaign) {
  const list = await recipients(sb, c);
  let sent = 0, failed = 0, lastError = '';
  for (const r of list) {
    try {
      if (c.channel === 'sms') {
        const body = personalise(c.message, r.name) + (c.kind === 'promotion' ? ` ${OPT_OUT}` : '');
        await sendSms(intl(r.phone), body);
      } else if (c.channel === 'email') {
        const body = personalise(c.message, r.name) + (c.kind === 'promotion' ? '\n\n—\nYou get this because you agreed to hear from JayTech9. Reply “unsubscribe” to stop.' : '');
        await sendEmail(r.email!, c.subject ?? 'JayTech9', body);
      }
      sent++;
    } catch (e) {
      failed++; lastError = (e as Error).message;
      if (sent === 0 && failed >= 3) break; // provider not set up: stop early
    }
  }
  await sb.from('campaigns').update({
    status: sent > 0 ? 'sent' : 'failed', sent_at: new Date().toISOString(), recipients: sent, error: failed ? `${failed} failed: ${lastError}` : null,
  }).eq('id', c.id);
  if (sent === 0 && failed > 0) throw new Error(lastError);
  return { sent, failed };
}
