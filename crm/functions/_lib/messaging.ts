// Sending SMS and email. Used by the CRM ("Send now") and by the scheduler worker (scheduled messages).
// To switch SMS provider (e.g. to mNotify or Hubtel), change only sendSms() below.
import type { Env } from './env';
import { now } from './http';

type Spec = { type: 'opted_in' } | { type: 'client'; client_id: string } | { type: 'service'; service: string };
export interface Campaign { id: string; channel: 'sms' | 'whatsapp' | 'email'; kind: 'promotion' | 'update'; audience_spec: string | Spec; subject: string | null; message: string }
interface Client { id: string; name: string; phone: string | null; email: string | null; service: string | null; marketing_opt_in: number }

export const OPT_OUT = 'Reply STOP to opt out.';

// 024 123 4567 → 233241234567
export function intl(phone?: string | null) {
  if (!phone) return '';
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = '233' + d.slice(1);
  return d;
}

const personalise = (t: string, name: string) => t.split('[first name]').join(name.split(' ')[0]);

export async function recipients(env: Env, c: Campaign) {
  const spec: Spec = typeof c.audience_spec === 'string' ? JSON.parse(c.audience_spec) : c.audience_spec;
  const { results } = await env.DB.prepare('SELECT id, name, phone, email, service, marketing_opt_in FROM clients').all<Client>();
  let list = results;
  if (spec.type === 'client') list = list.filter((x) => x.id === spec.client_id);
  if (spec.type === 'service') list = list.filter((x) => x.service === spec.service);
  // Promotions only ever go to clients who agreed. Checked here on the server, not only in the browser.
  if (c.kind === 'promotion' || spec.type !== 'client') list = list.filter((x) => x.marketing_opt_in);
  return list.filter((x) => (c.channel === 'email' ? !!x.email : !!x.phone));
}

async function sendSms(env: Env, to: string, message: string) {
  if (!env.ARKESEL_API_KEY) throw new Error('SMS is not set up yet (add ARKESEL_API_KEY)');
  const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: { 'api-key': env.ARKESEL_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ sender: env.SMS_SENDER_ID ?? 'JayTech9', message, recipients: [to] }),
  });
  if (!res.ok) throw new Error(`SMS provider said ${res.status}`);
}

async function sendEmail(env: Env, to: string, subject: string, text: string) {
  if (!env.RESEND_API_KEY) throw new Error('Email is not set up yet (add RESEND_API_KEY)');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM ?? 'JayTech9 <hello@jaytech9.com>', to, subject, text }),
  });
  if (!res.ok) throw new Error(`Email provider said ${res.status}`);
}

// Sends one message to everyone in its audience and records the result on the campaign.
export async function deliver(env: Env, c: Campaign) {
  const list = await recipients(env, c);
  let sent = 0, failed = 0, lastError = '';
  for (const r of list) {
    try {
      const text = personalise(c.message, r.name);
      if (c.channel === 'sms') await sendSms(env, intl(r.phone), c.kind === 'promotion' ? `${text} ${OPT_OUT}` : text);
      if (c.channel === 'email') {
        const footer = c.kind === 'promotion' ? '\n\n—\nYou get this because you agreed to hear from JayTech9. Reply “unsubscribe” to stop.' : '';
        await sendEmail(env, r.email!, c.subject ?? 'JayTech9', text + footer);
      }
      sent++;
    } catch (e) {
      failed++;
      lastError = (e as Error).message;
      if (sent === 0 && failed >= 3) break; // provider not set up or refusing: stop early
    }
  }
  await env.DB.prepare('UPDATE campaigns SET status = ?, sent_at = ?, recipients = ?, error = ? WHERE id = ?')
    .bind(sent > 0 || list.length === 0 ? 'sent' : 'failed', now(), sent, failed ? `${failed} failed: ${lastError}` : null, c.id).run();
  if (sent === 0 && failed > 0) throw new Error(lastError);
  return { sent, failed };
}

// Marks a campaign as "sending" only if nobody else has, so a message can never go out twice.
export async function claim(env: Env, id: string, from: 'draft' | 'scheduled') {
  const r = await env.DB.prepare("UPDATE campaigns SET status = 'sending' WHERE id = ? AND status = ? RETURNING *").bind(id, from).first<Campaign>();
  return r;
}
