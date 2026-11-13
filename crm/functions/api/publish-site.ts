// POST /api/publish-site → rebuilds the public website so CRM changes go live (about a minute)
import type { Ctx } from '../_lib/env';
import { HttpError, fail, json } from '../_lib/http';

export const onRequestPost = async (ctx: Ctx) => {
  try {
    if (!ctx.env.WEBSITE_DEPLOY_HOOK) throw new HttpError(500, 'Website deploy hook is not set up yet (see DEPLOY.md, step 5).');
    const res = await fetch(ctx.env.WEBSITE_DEPLOY_HOOK, { method: 'POST' });
    if (!res.ok) throw new HttpError(502, `Cloudflare said ${res.status}`);
    return json({ ok: true });
  } catch (e) { return fail(e); }
};
