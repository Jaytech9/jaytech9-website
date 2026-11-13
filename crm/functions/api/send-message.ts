// POST /api/send-message { campaign_id } → sends a saved message now
import { claim, deliver } from '../_lib/messaging';
import type { Ctx } from '../_lib/env';
import { HttpError, fail, json } from '../_lib/http';

export const onRequestPost = async (ctx: Ctx) => {
  try {
    const { campaign_id } = (await ctx.request.json()) as { campaign_id: string };
    const c = await claim(ctx.env, campaign_id, 'draft');
    if (!c) throw new HttpError(409, 'This message was already sent.');
    try {
      return json(await deliver(ctx.env, c));
    } catch (e) {
      throw new HttpError(502, (e as Error).message);
    }
  } catch (e) { return fail(e); }
};
