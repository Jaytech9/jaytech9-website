import { deliver, fail, json, requireStaff, type Campaign } from './_lib';

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const { sb } = await requireStaff(req);
    const { campaign_id } = (await req.json()) as { campaign_id: string };
    const { data, error } = await sb.from('campaigns').select('*').eq('id', campaign_id).single();
    if (error || !data) return json({ error: 'Message not found' }, 404);
    if (data.status === 'sent') return json({ error: 'Already sent' }, 409);
    return json(await deliver(sb, data as Campaign));
  } catch (e) { return fail(e); }
};
