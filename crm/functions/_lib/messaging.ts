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

// Company signature added to every email the CRM sends (plain text and HTML).
const SIGNATURE = {
  name: 'Jones Yaw Kwamehene',
  role: 'Founder & Lead Developer',
  company: 'JayTech9 (Jay Tech 9 Enterprise)',
  phone: '+233 50 618 1501',
  email: 'info@jaytech9.com',
  web: 'jaytech9.com',
  city: 'Accra, Ghana',
};
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function emailHtml(text: string) {
  const s = SIGNATURE;
  const body = esc(text).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f2f5f8;font-family:Arial,Helvetica,sans-serif;color:#10293a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border-top:4px solid #3cc64a">
<tr><td style="padding:28px 28px 8px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:8px 28px 28px">
<table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #e3eaf0;padding-top:14px;width:100%"><tr>
<td width="56" valign="top" style="padding-top:14px"><img src="https://jaytech9.com/logo-512.png" width="44" height="44" alt="JayTech9" style="border-radius:50%;display:block"></td>
<td valign="top" style="padding-top:14px;font-size:13px;line-height:1.5;color:#3e5a6b">
<strong style="font-size:14px;color:#10293a">${s.name}</strong><br>${s.role}, ${s.company}<br>
<a href="tel:${s.phone.replace(/\s/g, '')}" style="color:#0068a1;text-decoration:none">${s.phone}</a> &middot;
<a href="mailto:${s.email}" style="color:#0068a1;text-decoration:none">${s.email}</a> &middot;
<a href="https://${s.web}" style="color:#0068a1;text-decoration:none">${s.web}</a><br>${s.city}
</td></tr></table></td></tr></table></body></html>`;
}
const textSignature = () => {
  const s = SIGNATURE;
  return `\n\n--\n${s.name}\n${s.role}, ${s.company}\n${s.phone} | ${s.email} | ${s.web}\n${s.city}`;
};

async function sendEmail(env: Env, to: string, subject: string, text: string) {
  if (!env.RESEND_API_KEY) throw new Error('Email is not set up yet (add RESEND_API_KEY)');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? 'JayTech9 <info@jaytech9.com>',
      reply_to: 'info@jaytech9.com',
      to, subject,
      text: text + textSignature(),
      html: emailHtml(text),
    }),
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
