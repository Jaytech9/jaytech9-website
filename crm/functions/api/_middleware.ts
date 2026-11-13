// Runs before every /api/* request: checks who is signed in and stops everyone else.
import { currentStaff } from '../_lib/auth';
import type { Ctx } from '../_lib/env';
import { fail } from '../_lib/http';

export const onRequest = async (ctx: Ctx) => {
  try {
    ctx.data.user = await currentStaff(ctx.request, ctx.env);
    return await ctx.next();
  } catch (e) {
    return fail(e);
  }
};
