// Small Cloudflare Worker that wakes every 15 minutes and sends scheduled messages that are due.
// Deploy once with:  cd crm && npx wrangler deploy --config workers/scheduler/wrangler.toml
import { claim, deliver, type Campaign } from '../../functions/_lib/messaging';
import type { Env } from '../../functions/_lib/env';

export default {
  async scheduled(_event: ScheduledEvent, env: Env) {
    const { results } = await env.DB.prepare(
      "SELECT id FROM campaigns WHERE status = 'scheduled' AND scheduled_at <= ? LIMIT 20",
    ).bind(new Date().toISOString()).all<{ id: string }>();
    for (const { id } of results) {
      const c = await claim(env, id, 'scheduled');
      if (!c) continue;
      try { await deliver(env, c as Campaign); } catch (e) { console.error('scheduled message failed', id, (e as Error).message); }
    }
  },
};
