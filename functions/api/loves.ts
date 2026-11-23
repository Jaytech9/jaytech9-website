// "Love this" on the design gallery.
//   GET  /api/loves              → { counts: { [designId]: n }, mine: [designId, …] }
//   POST /api/loves { id, on }   → { id, count, loved }
// A visitor is a one-way code made from their connection and browser (no IP is stored), so each
// person can love a design once. Hearts only add up; nothing a visitor types is ever shown.
import type { Env } from '../_lib/env';

const ID = /^[a-z0-9-]{2,64}$/;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function visitorOf(request: Request) {
  const raw = `jt9-love:${request.headers.get('cf-connecting-ip') ?? ''}:${request.headers.get('user-agent') ?? ''}`;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)));
  return Array.from(d.slice(0, 10), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const v = await visitorOf(request);
    const [counts, mine] = await env.DB.batch([
      env.DB.prepare('SELECT design_id, COUNT(*) AS n FROM design_loves GROUP BY design_id'),
      env.DB.prepare('SELECT design_id FROM design_loves WHERE visitor = ?').bind(v),
    ]);
    return json({
      counts: Object.fromEntries((counts.results as { design_id: string; n: number }[]).map((r) => [r.design_id, r.n])),
      mine: (mine.results as { design_id: string }[]).map((r) => r.design_id),
    });
  } catch { return json({ counts: {}, mine: [] }); }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const b = (await request.json().catch(() => ({}))) as { id?: string; on?: boolean };
  if (!b.id || !ID.test(b.id)) return json({ error: 'Unknown design.' }, 400);
  const v = await visitorOf(request);
  if (b.on) {
    // At most 60 hearts an hour from one visitor: plenty for real people, useless for bots.
    const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM design_loves WHERE visitor = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')").bind(v).first<{ n: number }>();
    if ((recent?.n ?? 0) >= 60) return json({ error: 'Slow down a little.' }, 429);
    await env.DB.prepare('INSERT OR IGNORE INTO design_loves (design_id, visitor) VALUES (?, ?)').bind(b.id, v).run();
  } else {
    await env.DB.prepare('DELETE FROM design_loves WHERE design_id = ? AND visitor = ?').bind(b.id, v).run();
  }
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM design_loves WHERE design_id = ?').bind(b.id).first<{ n: number }>();
  return json({ id: b.id, count: c?.n ?? 0, loved: !!b.on });
};
