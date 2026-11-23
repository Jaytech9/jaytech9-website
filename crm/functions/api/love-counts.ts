// POST /api/love-counts → { [designId]: n } — hearts per gallery piece, for CRM → Gallery.
import type { Ctx } from '../_lib/env';
import { fail, json } from '../_lib/http';

export const onRequestPost = async (ctx: Ctx) => {
  try {
    const { results } = await ctx.env.DB.prepare('SELECT design_id, COUNT(*) AS n FROM design_loves GROUP BY design_id').all<{ design_id: string; n: number }>();
    return json(Object.fromEntries(results.map((r) => [r.design_id, r.n])));
  } catch (e) {
    if (String(e).includes('no such table')) return json({});
    return fail(e);
  }
};
