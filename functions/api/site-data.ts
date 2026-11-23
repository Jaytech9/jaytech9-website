// GET /api/site-data → what the CRM controls on the website: section switches, approved reviews and
// projects marked "Show on the website". Read by the website build (src/lib/crm.ts).
// Only public fields leave the database here: no money, phone numbers or emails.
import type { Env } from '../_lib/env';
import { publicStats } from '../_lib/stats';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const [sections, reviews, projects] = await env.DB.batch([
    env.DB.prepare('SELECT key, enabled FROM site_sections'),
    env.DB.prepare("SELECT id, name, organisation, role, rating, message, product FROM reviews WHERE status = 'approved' AND consent = 1 ORDER BY created_at DESC LIMIT 50"),
    env.DB.prepare('SELECT id, title, service, website_summary AS summary, website_outcome AS outcome, live_url FROM projects WHERE show_on_website = 1 ORDER BY updated_at DESC LIMIT 50'),
  ]);
  const stats = await publicStats(env).catch(() => null);   // null until the orders tables exist
  return new Response(
    JSON.stringify({
      sections: (sections.results as { key: string; enabled: number }[]).map((s) => ({ key: s.key, enabled: !!s.enabled })),
      reviews: reviews.results,
      projects: projects.results,
      stats,
    }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' } },
  );
};
