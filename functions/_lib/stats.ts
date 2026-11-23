// Public numbers for the home page strip and the donation progress bar. Counts only, no personal data.
import type { Env } from './env';

export async function publicStats(env: Env) {
  const [work, clients, rating, gifts] = await env.DB.batch([
    env.DB.prepare("SELECT (SELECT COUNT(*) FROM orders WHERE status = 'completed') + (SELECT COUNT(*) FROM projects WHERE status = 'delivered') AS n"),
    env.DB.prepare("SELECT COUNT(DISTINCT client_id) AS n FROM (SELECT client_id FROM orders WHERE status = 'completed' UNION ALL SELECT client_id FROM projects WHERE status = 'delivered') WHERE client_id IS NOT NULL"),
    env.DB.prepare("SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS n FROM reviews WHERE status = 'approved' AND rating IS NOT NULL"),
    env.DB.prepare("SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS n FROM payments WHERE kind = 'donation' AND status = 'success'"),
  ]);
  const one = (r: D1Result) => (r.results[0] ?? {}) as Record<string, number | null>;
  return {
    delivered: Number(one(work).n ?? 0),
    clients: Number(one(clients).n ?? 0),
    rating: one(rating).avg ?? null,
    ratings: Number(one(rating).n ?? 0),
    donations: { total: Number(one(gifts).total ?? 0), donors: Number(one(gifts).n ?? 0) },
  };
}
