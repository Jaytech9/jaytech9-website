// POST /api/orders — a visitor requests a service on /order/. Saves the order (status "requested"),
// links or creates the client, stores up to 5 uploaded files in R2 (if the FILES bucket is set up),
// and returns the private tracking link. No money is involved yet: we send a quote first.
import type { Env } from '../_lib/env';
import { tooMany } from '../_lib/forms';
import { clean, json, newRef, newToken, now, uuid } from '../_lib/orders';

const MAX_FILES = 5;
const MAX_BYTES = 20 * 1024 * 1024;           // 20 MB each; bigger files go through a link
const OK_TYPES = /^(image\/|video\/|audio\/|application\/pdf$|application\/zip$|application\/x-zip|application\/vnd\.openxmlformats|application\/msword$|text\/plain$)/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (await tooMany(env, request.headers.get('cf-connecting-ip') ?? 'unknown')) return json({ error: 'Too many requests. Please wait a minute.' }, 429);
    let f: FormData;
    try { f = await request.formData(); } catch { return json({ error: 'The form could not be read.' }, 400); }
    if (String(f.get('company-website') ?? '').trim()) return json({ ok: true, ref: 'JT9-000000', token: '' });   // bot trap

    const name = clean(f.get('name'), 120);
    const phone = clean(f.get('phone'), 40);
    const email = clean(f.get('email'), 200)?.toLowerCase() ?? null;
    const service = clean(f.get('service'), 80);
    const brief = clean(f.get('brief'), 4000);
    if (!name || !service || !brief || (!phone && !email)) return json({ error: 'Please add your name, the service, a short brief, and a phone number or email.' }, 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'That email address does not look right.' }, 400);
    const link = clean(f.get('materials_link'), 600);
    if (link && !/^https:\/\//i.test(link)) return json({ error: 'The materials link should start with https://' }, 400);
    const wanted = clean(f.get('wanted_by'), 10);

    const files = f.getAll('files').filter((x): x is File => x instanceof File && x.size > 0);
    if (files.length > MAX_FILES) return json({ error: `Please attach at most ${MAX_FILES} files, or share a link for the rest.` }, 400);
    for (const file of files) {
      if (file.size > MAX_BYTES) return json({ error: `"${file.name}" is over 20 MB. Please share it with a Google Drive or WeTransfer link instead.` }, 400);
      if (!OK_TYPES.test(file.type)) return json({ error: `"${file.name}" is not a file type we accept. Images, video, audio, PDF, Word and ZIP are fine.` }, 400);
    }
    if (files.length && !env.FILES) return json({ error: 'File uploads are not switched on yet. Please share your files with a link instead.' }, 400);

    const db = env.DB;
    const client = await db.prepare('SELECT id FROM clients WHERE (phone IS NOT NULL AND phone = ?) OR (email IS NOT NULL AND lower(email) = ?) LIMIT 1')
      .bind(phone ?? '', email ?? '').first<{ id: string }>();
    const clientId = client?.id ?? uuid();
    const id = uuid(), ref = newRef(), token = newToken(), t = now();

    const stmts = [];
    if (!client) stmts.push(db.prepare("INSERT INTO clients (id, name, phone, email, organisation, service, source, marketing_opt_in, created_at) VALUES (?, ?, ?, ?, ?, ?, 'Service order', 0, ?)")
      .bind(clientId, name, phone, email, clean(f.get('organisation'), 160), service, t));
    stmts.push(db.prepare(`INSERT INTO orders (id, ref, token, client_id, name, email, phone, organisation, service, title, brief, materials_link, wanted_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, ref, token, clientId, name, email, phone, clean(f.get('organisation'), 160), service, clean(f.get('title'), 160), brief, link,
        wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? wanted : null, t, t));
    stmts.push(db.prepare("INSERT INTO order_updates (id, order_id, author, message, created_at) VALUES (?, ?, 'system', ?, ?)")
      .bind(uuid(), id, 'Request received. We will review your brief and send you a quote, usually within one working day.', t));

    for (const file of files) {
      const key = `orders/${id}/${uuid()}`;
      await env.FILES!.put(key, file.stream(), { httpMetadata: { contentType: file.type, contentDisposition: `attachment; filename="${file.name.replace(/["\\\r\n]/g, '')}"` } });
      stmts.push(db.prepare('INSERT INTO order_files (id, order_id, r2_key, name, size, type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(uuid(), id, key, file.name.slice(0, 200), file.size, file.type, t));
    }
    await db.batch(stmts);
    return json({ ok: true, ref, token }, 201);
  } catch (e) {
    console.error('order not saved', (e as Error).message);
    return json({ error: 'Something went wrong on our side. Please try again or message us on WhatsApp.' }, 500);
  }
};
