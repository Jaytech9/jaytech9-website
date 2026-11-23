// GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD — which call times are taken or blocked, so the
// booking page can grey them out. Only dates and times leave the database: no names or details.
import type { Env } from '../_lib/env';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const q = new URL(request.url).searchParams;
  const from = q.get('from') ?? '', to = q.get('to') ?? '';
  if (!DAY.test(from) || !DAY.test(to) || Date.parse(to) - Date.parse(from) > 45 * 86400e3 || to < from) {
    return Response.json({ error: 'Bad date range.' }, { status: 400 });
  }
  const [booked, blocked] = await env.DB.batch([
    env.DB.prepare("SELECT substr(call_at, 1, 10) AS day, substr(call_at, 12, 5) AS slot FROM bookings WHERE call_at >= ? AND call_at < ? AND status IN ('new', 'confirmed')")
      .bind(`${from}T00:00`, `${to}T23:59:59.999Z~`),
    env.DB.prepare('SELECT day, slot FROM blocked_times WHERE day BETWEEN ? AND ?').bind(from, to),
  ]);
  const taken: Record<string, string[]> = {};
  const closed: string[] = [];
  for (const r of [...booked.results, ...blocked.results] as { day: string; slot: string | null }[]) {
    if (r.slot == null) { if (!closed.includes(r.day)) closed.push(r.day); continue; }
    (taken[r.day] ??= []).includes(r.slot) || taken[r.day].push(r.slot);
  }
  return new Response(JSON.stringify({ taken, closed }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
};
