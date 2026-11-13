// Netlify runs this automatically after every verified form submission (spam is filtered first).
// It copies bookings, contact messages and reviews into the JayTech9 CRM. If the CRM keys are not
// set yet it does nothing, and submissions still appear under Forms in Netlify as before.
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const rest = async (path, init = {}) => {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'return=representation', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path.split('?')[0]}: ${res.status} ${await res.text()}`);
  return res.json();
};

const clean = (v, max = 2000) => {
  const s = Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v);
  const t = s.trim().slice(0, max);
  return t || null;
};

// Find the client by email or phone, or add them.
async function clientFor(d, service) {
  const email = clean(d.email, 200)?.toLowerCase();
  const phone = clean(d.phone, 40);
  const or = [email && `email.eq.${encodeURIComponent(email)}`, phone && `phone.eq.${encodeURIComponent(phone)}`].filter(Boolean).join(',');
  if (or) {
    const found = await rest(`clients?select=id&or=(${or})&limit=1`);
    if (found[0]) return found[0].id;
  }
  const [c] = await rest('clients', {
    method: 'POST',
    body: JSON.stringify({ name: clean(d.name, 120) ?? 'Website visitor', organisation: clean(d.organisation ?? d.business, 120), email, phone, service, source: clean(d.source, 60) ?? 'Website', marketing_opt_in: false }),
  });
  return c.id;
}

export const handler = async (event) => {
  if (!URL_ || !KEY) return { statusCode: 200, body: 'CRM not connected' };
  const { payload } = JSON.parse(event.body);
  const d = payload.data ?? {};
  const form = payload.form_name;
  try {
    if (form === 'booking') {
      const service = clean(d.service, 80);
      const client_id = await clientFor(d, service);
      const date = clean(d.preferred_date, 10), time = clean(d.preferred_time, 5);
      const call_at = date && time && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) ? `${date}T${time}:00Z` : null; // Ghana time = UTC
      const details = [clean(d.details), clean(d.link, 300) && `Link: ${clean(d.link, 300)}`].filter(Boolean).join('\n');
      await rest('bookings', {
        method: 'POST',
        body: JSON.stringify({
          client_id, name: clean(d.name, 120) ?? 'Website visitor', organisation: clean(d.organisation, 120), email: clean(d.email, 200),
          phone: clean(d.phone, 40), service, details: details || null, budget: clean(d.budget, 60), timeline: clean(d.timeline, 60),
          method: clean(d.method, 60), call_at, source: clean(d.source, 60), status: 'new',
        }),
      });
    } else if (form === 'contact') {
      const client_id = await clientFor(d, null);
      await rest('enquiries', {
        method: 'POST',
        body: JSON.stringify({ client_id, name: clean(d.name, 120) ?? 'Website visitor', email: clean(d.email, 200), phone: clean(d.phone, 40), organisation: clean(d.business, 120), needs: clean(d.needs, 300), message: clean(d.message), status: 'new' }),
      });
    } else if (form === 'review') {
      const rating = Math.min(5, Math.max(1, Number(d.rating) || 5));
      await rest('reviews', {
        method: 'POST',
        body: JSON.stringify({ name: clean(d.name, 80) ?? 'Client', organisation: clean(d.organisation, 80), role: clean(d.role, 60), rating, message: clean(d.message, 300) ?? '', consent: d.consent === 'yes', status: 'pending' }),
      });
    }
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error('[crm] could not save submission', form, e.message);
    return { statusCode: 200, body: 'saved in Netlify Forms only' }; // never fail the visitor's submission
  }
};
