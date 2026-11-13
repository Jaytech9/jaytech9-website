// Runs every 15 minutes and sends any scheduled messages that are due.
import { admin, deliver, type Campaign } from './_lib';

export default async () => {
  const sb = admin();
  const { data } = await sb.from('campaigns').select('*').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).limit(20);
  for (const c of data ?? []) {
    // claim it first so two runs never send the same message twice
    const { data: claimed } = await sb.from('campaigns').update({ status: 'draft' }).eq('id', c.id).eq('status', 'scheduled').select('id');
    if (!claimed?.length) continue;
    try { await deliver(sb, c as Campaign); } catch { /* recorded as failed in deliver() */ }
  }
  return new Response('ok');
};

export const config = { schedule: '*/15 * * * *' };
