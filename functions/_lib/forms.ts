// Saves website form posts (booking, contact, review) into the database, where the CRM shows them.
// To add a new form: give it <input type="hidden" name="form-name" value="yourname">, post it to a
// "/…/thanks/" page listed in public/_routes.json, and add a case to saveForm() below.
import type { Env } from './env';

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

const clean = (v: string | string[] | null | undefined, max = 2000) => {
  const s = Array.isArray(v) ? v.map(String).join(', ') : v == null ? '' : String(v);
  const t = s.trim().slice(0, max);
  return t || null;
};

// Find the client by email or phone, or add them as a new client.
async function clientFor(env: Env, f: Map<string, string[]>, service: string | null) {
  const email = clean(f.get('email')?.[0], 200)?.toLowerCase() ?? null;
  const phone = clean(f.get('phone')?.[0], 40);
  const found = await env.DB.prepare('SELECT id FROM clients WHERE (email = ?1 AND ?1 IS NOT NULL) OR (phone = ?2 AND ?2 IS NOT NULL) LIMIT 1')
    .bind(email, phone).first<{ id: string }>();
  if (found) return found.id;
  const id = uuid();
  await env.DB.prepare(
    'INSERT INTO clients (id, name, organisation, email, phone, service, source, marketing_opt_in, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
  ).bind(id, clean(f.get('name')?.[0], 120) ?? 'Website visitor', clean((f.get('organisation') ?? f.get('business'))?.[0], 120),
    email, phone, service, clean(f.get('source')?.[0], 60) ?? 'Website', now()).run();
  return id;
}

export async function saveForm(env: Env, form: FormData) {
  // Group values by name (checkbox groups such as "needs" send several).
  const f = new Map<string, string[]>();
  for (const [k, v] of form.entries()) f.set(k, [...(f.get(k) ?? []), String(v)]);
  const one = (k: string, max?: number) => clean(f.get(k)?.[0], max);
  const name = form.get('form-name');

  if (name === 'booking') {
    const service = one('service', 80);
    const client_id = await clientFor(env, f, service);
    const date = one('preferred_date', 10), time = one('preferred_time', 5);
    const call_at = date && time && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) ? `${date}T${time}:00.000Z` : null; // Ghana time = UTC
    const details = [one('details'), one('link', 300) && `Link: ${one('link', 300)}`].filter(Boolean).join('\n') || null;
    await env.DB.prepare(
      `INSERT INTO bookings (id, client_id, name, organisation, email, phone, service, details, budget, timeline, method, call_at, source, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    ).bind(uuid(), client_id, one('name', 120) ?? 'Website visitor', one('organisation', 120), one('email', 200), one('phone', 40),
      service, details, one('budget', 60), one('timeline', 60), one('method', 60), call_at, one('source', 60), now()).run();
    return true;
  }

  if (name === 'contact') {
    const client_id = await clientFor(env, f, null);
    await env.DB.prepare(
      `INSERT INTO enquiries (id, client_id, name, email, phone, organisation, needs, message, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    ).bind(uuid(), client_id, one('name', 120) ?? 'Website visitor', one('email', 200), one('phone', 40), one('business', 120),
      clean(f.get('needs'), 300), one('message'), now()).run();
    return true;
  }

  if (name === 'review') {
    const rating = Math.min(5, Math.max(1, Number(one('rating')) || 5));
    const message = one('message', 300);
    if (!message) return false;
    await env.DB.prepare(
      `INSERT INTO reviews (id, name, organisation, role, rating, message, consent, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    ).bind(uuid(), one('name', 80) ?? 'Client', one('organisation', 80), one('role', 60), rating, message, one('consent') === 'yes' ? 1 : 0, now()).run();
    return true;
  }
  return false;
}

// At most 5 form posts a minute from one visitor. Stops simple spam bots without bothering people.
export async function tooMany(env: Env, ip: string) {
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`jt9:${ip}`))))
    .slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  const minute = new Date().toISOString().slice(0, 16);
  const row = await env.DB.prepare(
    'INSERT INTO form_hits (ip_hash, minute, hits) VALUES (?, ?, 1) ON CONFLICT (ip_hash, minute) DO UPDATE SET hits = hits + 1 RETURNING hits',
  ).bind(hash, minute).first<{ hits: number }>();
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM form_hits WHERE minute < ?').bind(new Date(Date.now() - 3600e3).toISOString().slice(0, 16)).run();
  return (row?.hits ?? 0) > 5;
}
